// src/screens/SessionDetailScreen.tsx
// Detail Sesi (redesign). Satu halaman untuk dua peran:
// - Asisten: info sesi, buka/tutup presensi, daftar hadir (hadir/izin/belum), ringkasan ulasan.
//   Menggantikan halaman lama Kelola Sesi (/kelola/[id]) dan Rekap Kehadiran (/rekap/[id]).
// - Praktikan: info sesi dan status kehadirannya, tombol presensi, izin, dan ulasan.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Hills } from '../components/ui/Hills';
import { OrangePanel } from '../components/ui/OrangePanel';
import { useApp } from '../context/AppContext';
import { useMyAttendances, useSessionAttendances } from '../hooks/useAttendanceData';
import { useLabs } from '../hooks/useLabs';
import { useMyReviews, useSessionReviews } from '../hooks/useReviews';
import { fetchRoster, Praktikan } from '../services/attendanceService';
import { findLabForSession } from '../services/labService';
import {
  listenPermissionsByPraktikan,
  listenPermissionsBySession,
  PermissionRecord,
} from '../services/permissionService';
import { setSessionStatus } from '../services/sessionControlService';
import { color, font, radius, sessionStatusColor } from '../theme/tokens';
import { Attendance, Session } from '../types';
import { formatJam, formatTanggal } from '../utils/formatTime';

const FIGMA_WIDTH = 402;
const DECOR_TOP = 75;

type RowState = 'HADIR' | 'IZIN' | 'IZIN_MENUNGGU' | 'BELUM' | 'ALPA';

const ROW_STYLE: Record<RowState, { bg: string; text: string }> = {
  HADIR: { bg: color.successSoft, text: color.success },
  IZIN: { bg: color.warningSoft, text: color.warning },
  IZIN_MENUNGGU: { bg: color.lavenderSoft, text: color.purpleInk },
  BELUM: { bg: color.dayBg, text: color.muted },
  ALPA: { bg: color.dangerSoft, text: color.danger },
};

function rowLabel(state: RowState, attendance?: Attendance) {
  switch (state) {
    case 'HADIR':
      return `Hadir ${attendance ? formatJam(attendance.waktu) : ''}`.trim();
    case 'IZIN':
      return 'Izin';
    case 'IZIN_MENUNGGU':
      return 'Izin menunggu';
    case 'ALPA':
      return 'Tidak hadir';
    default:
      return 'Belum hadir';
  }
}

function stateOf(session: Session, attendance?: Attendance, permission?: PermissionRecord): RowState {
  if (attendance) return 'HADIR';
  if (permission?.status === 'DITERIMA') return 'IZIN';
  if (permission?.status === 'MENUNGGU') return 'IZIN_MENUNGGU';
  return session.status === 'DITUTUP' ? 'ALPA' : 'BELUM';
}

// ===== Bagian umum =====

function InfoCard({ session, location, onEdit }: { session: Session; location: string; onEdit?: () => void }) {
  const badge = sessionStatusColor[session.status];
  return (
    <View style={styles.infoCard}>
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={18} color={color.inkSoft} />
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        {onEdit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ubah sesi"
            onPress={onEdit}
            hitSlop={10}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          >
            <Feather name="edit-2" size={20} color={color.ink} />
          </Pressable>
        )}
      </View>
      <Text style={styles.title}>{session.praktikum}</Text>
      {!!session.materi && <Text style={styles.materi}>{session.materi}</Text>}

      <View style={styles.facts}>
        <Fact icon="calendar" text={formatTanggal(session.tanggal)} />
        <Fact icon="clock" text={`${session.jamMulai} - ${session.jamSelesai}`} />
        <Fact icon="users" text={`Kelas ${session.kelas} · Pertemuan ${session.pertemuan}`} />
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
        {!!session.dibukaPada && <Text style={styles.small}>Dibuka {formatJam(session.dibukaPada)}</Text>}
        {!!session.ditutupPada && <Text style={styles.small}>· Ditutup {formatJam(session.ditutupPada)}</Text>}
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Feather name={icon} size={16} color={color.purpleDeep} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function BigButton({ label, onPress, variant = 'primary', icon }: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  icon?: keyof typeof Feather.glyphMap;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.bigButton, primary ? styles.bigPrimary : styles.bigOutline, pressed && styles.pressed]}
    >
      {icon && <Feather name={icon} size={18} color={primary ? color.onDark : color.purpleInk} />}
      <Text style={[styles.bigText, { color: primary ? color.onDark : color.purpleInk }]}>{label}</Text>
    </Pressable>
  );
}

// ===== Asisten =====

function AsistenSection({ session }: { session: Session }) {
  const { currentUser } = useApp();
  const { data: attendances } = useSessionAttendances(session.id);
  const { data: reviews } = useSessionReviews(session.id);
  const [roster, setRoster] = useState<Praktikan[]>([]);
  const [rosterError, setRosterError] = useState('');
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [pending, setPending] = useState<'DIBUKA' | 'DITUTUP' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Profil praktikan terdaftar diambil ulang saat daftar praktikan sesi berubah.
  const enrolledKey = (session.enrolledStudents ?? []).join(',');
  useEffect(() => {
    let cancelled = false;
    fetchRoster(session)
      .then((rows) => {
        if (!cancelled) {
          setRoster(rows);
          setRosterError('');
        }
      })
      .catch(() => !cancelled && setRosterError('Daftar praktikan gagal dimuat.'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, enrolledKey]);

  useEffect(() => listenPermissionsBySession(session.id, setPermissions), [session.id]);

  const rows = useMemo(
    () =>
      roster.map((p) => {
        const attendance = attendances.find((a) => a.praktikanId === p.id);
        const permission = permissions.find((x) => x.praktikanId === p.id);
        return { p, attendance, state: stateOf(session, attendance, permission) };
      }),
    [roster, attendances, permissions, session],
  );

  const total = (session.enrolledStudents ?? []).length;
  const hadir = rows.filter((r) => r.state === 'HADIR').length;
  const izin = rows.filter((r) => r.state === 'IZIN').length;
  const percent = total === 0 ? 0 : Math.round((hadir / total) * 100);

  const sentiment = useMemo(() => {
    const count = { positif: 0, netral: 0, negatif: 0 };
    reviews.forEach((r) => {
      const key = r.sentimen?.toLowerCase() as keyof typeof count;
      if (key in count) count[key] += 1;
    });
    return count;
  }, [reviews]);

  async function confirmStatus() {
    if (!pending || !currentUser) return;
    setBusy(true);
    setActionError('');
    try {
      await setSessionStatus(session.id, pending, currentUser.id);
      setPending(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Status sesi gagal diperbarui.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OrangePanel title="Presensi">
        <Text style={styles.panelText}>
          {session.status === 'BELUM_DIBUKA'
            ? 'Presensi belum dibuka. Praktikan baru bisa presensi setelah kamu membukanya.'
            : session.status === 'DIBUKA'
              ? `Presensi sedang dibuka. ${hadir} dari ${total} praktikan sudah hadir.`
              : `Presensi sudah ditutup. ${hadir} dari ${total} praktikan hadir.`}
        </Text>
        {session.status === 'BELUM_DIBUKA' && (
          <BigButton label="Buka Presensi" icon="unlock" onPress={() => setPending('DIBUKA')} />
        )}
        {session.status === 'DIBUKA' && (
          <BigButton label="Tutup Presensi" icon="lock" onPress={() => setPending('DITUTUP')} />
        )}
      </OrangePanel>

      <OrangePanel title="Daftar Hadir" right={`${hadir}/${total} hadir`}>
        <View style={styles.progressTrack} accessibilityLabel={`${percent} persen hadir`}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.small}>
          Hadir {hadir} · Izin {izin} · {session.status === 'DITUTUP' ? 'Tidak hadir' : 'Belum hadir'} {Math.max(total - hadir - izin, 0)}
        </Text>

        {!!rosterError && <Text style={styles.error}>{rosterError}</Text>}
        {!rosterError && total === 0 && <Text style={styles.helper}>Belum ada praktikan terdaftar di sesi ini.</Text>}

        {rows.map(({ p, attendance, state }) => {
          const s = ROW_STYLE[state];
          return (
            <View key={p.id} style={styles.person}>
              <View style={styles.flex}>
                <Text style={styles.personName} numberOfLines={1}>{p.nama}</Text>
                <Text style={styles.personSub}>
                  {p.nim}
                  {attendance?.jarakMeter != null ? ` · ${Math.round(attendance.jarakMeter)} m dari lab` : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{rowLabel(state, attendance)}</Text>
              </View>
            </View>
          );
        })}
      </OrangePanel>

      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Ulasan</Text>
          <Text style={styles.small}>{reviews.length} ulasan</Text>
        </View>
        <View style={styles.sentimentRow}>
          <SentimentChip label="Positif" value={sentiment.positif} bg={color.successSoft} fg={color.success} />
          <SentimentChip label="Netral" value={sentiment.netral} bg={color.lavenderSoft} fg={color.purpleInk} />
          <SentimentChip label="Negatif" value={sentiment.negatif} bg={color.dangerSoft} fg={color.danger} />
        </View>
        <BigButton
          label="Lihat ulasan"
          variant="outline"
          onPress={() => router.push({ pathname: '/ulasan', params: { sessionId: session.id } })}
        />
      </View>

      <ConfirmDialog
        visible={!!pending}
        title={pending === 'DIBUKA' ? 'Buka presensi?' : 'Tutup presensi?'}
        message={
          pending === 'DIBUKA'
            ? `${session.praktikum} · Kelas ${session.kelas}. Praktikan yang terdaftar akan bisa presensi.`
            : `${session.praktikum} · Kelas ${session.kelas}. Setelah ditutup, praktikan tidak bisa presensi lagi.`
        }
        confirmLabel={pending === 'DIBUKA' ? 'Buka' : 'Tutup'}
        danger={pending === 'DITUTUP'}
        busy={busy}
        error={actionError}
        onConfirm={confirmStatus}
        onCancel={() => {
          if (busy) return;
          setPending(null);
          setActionError('');
        }}
      />
    </>
  );
}

function SentimentChip({ label, value, bg, fg }: { label: string; value: number; bg: string; fg: string }) {
  return (
    <View style={[styles.sentiment, { backgroundColor: bg }]}>
      <Text style={[styles.sentimentValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.sentimentLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ===== Praktikan =====

function PraktikanSection({ session }: { session: Session }) {
  const { currentUser } = useApp();
  const uid = currentUser?.id;
  const { data: myAttendances } = useMyAttendances(uid);
  const { data: myReviews } = useMyReviews(uid);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenPermissionsByPraktikan(uid, setPermissions);
  }, [uid]);

  const attendance = myAttendances.find((a) => a.sessionId === session.id);
  const permission = permissions.find((p) => p.sessionId === session.id);
  const reviewed = myReviews.some((r) => r.sessionId === session.id);
  const state = stateOf(session, attendance, permission);
  const s = ROW_STYLE[state];

  const text = {
    HADIR: `Kamu sudah presensi pukul ${attendance ? formatJam(attendance.waktu) : '-'}${
      attendance?.jarakMeter != null ? `, ${Math.round(attendance.jarakMeter)} m dari lab` : ''
    }.`,
    IZIN: 'Izinmu untuk sesi ini sudah diterima asisten.',
    IZIN_MENUNGGU: 'Pengajuan izinmu sedang menunggu keputusan asisten.',
    BELUM:
      session.status === 'DIBUKA'
        ? 'Presensi sedang dibuka. Lakukan presensi di dalam area lab.'
        : 'Presensi belum dibuka oleh asisten.',
    ALPA: 'Presensi sudah ditutup dan kamu tidak tercatat hadir.',
  }[state];

  return (
    <OrangePanel title="Kehadiranmu">
      <View style={[styles.badge, styles.badgeLarge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{rowLabel(state, attendance)}</Text>
      </View>
      <Text style={styles.panelText}>{text}</Text>

      {state === 'BELUM' && session.status === 'DIBUKA' && (
        <BigButton label="Presensi Sekarang" icon="map-pin" onPress={() => router.push(`/presensi/${session.id}`)} />
      )}
      {state === 'BELUM' && (
        <BigButton
          label="Ajukan Izin"
          variant="outline"
          onPress={() => router.push({ pathname: '/praktikan/izin', params: { sessionId: session.id } })}
        />
      )}
      {state === 'HADIR' && !reviewed && (
        <BigButton
          label="Tulis Ulasan"
          icon="message-circle"
          onPress={() => router.push({ pathname: '/ulasan', params: { sessionId: session.id } })}
        />
      )}
      {state === 'HADIR' && reviewed && <Text style={styles.small}>Terima kasih, ulasanmu sudah terkirim.</Text>}
    </OrangePanel>
  );
}

// ===== Halaman =====

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, role } = useApp();
  const { labs } = useLabs();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;

  const session = sessions.find((s) => s.id === id);
  const isAsisten = role === 'ASISTEN';
  const lab = session ? findLabForSession(session, labs) : undefined;
  const location = session ? (lab ? `${lab.nama}, ${lab.gedung}` : session.ruang) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.lavenderTop, { height: (DECOR_TOP + 140) * k }]} pointerEvents="none" />
        <View style={[styles.decor, { top: DECOR_TOP * k }]} pointerEvents="none">
          <Hills preset="awan" />
        </View>

        <View style={styles.header}>
          <BackHeader title="Detil Sesi" variant="onLavender" />
        </View>

        {!session ? (
          <View style={styles.body}>
            <View style={styles.infoCard}>
              <Text style={styles.title}>Sesi tidak ditemukan</Text>
              <Text style={styles.materi}>Sesi ini mungkin sudah dihapus, atau kamu tidak terdaftar di dalamnya.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <InfoCard
              session={session}
              location={location}
              onEdit={isAsisten ? () => router.push(`/sesi/form?id=${session.id}`) : undefined}
            />
            {isAsisten ? <AsistenSection session={session} /> : <PraktikanSection session={session} />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.lavender },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  content: { flexGrow: 1, backgroundColor: color.background },
  lavenderTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.lavender },
  decor: { position: 'absolute', left: 0, right: 0 },
  header: { paddingHorizontal: 17, paddingTop: 12 },
  body: { paddingHorizontal: 24, paddingTop: 28, gap: 18 },

  infoCard: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 6,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.inkSoft },
  editButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 34, color: color.ink },
  materi: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },
  facts: { gap: 6, marginTop: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factText: { fontFamily: font.medium, fontSize: 14, color: color.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  badge: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeLarge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { fontFamily: font.semibold, fontSize: 12 },
  small: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: color.muted },
  panelText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft, marginVertical: 8 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted, marginTop: 10 },
  error: { fontFamily: font.medium, fontSize: 13, color: color.danger, marginTop: 10 },

  bigButton: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bigPrimary: { backgroundColor: color.plum },
  bigOutline: { borderWidth: 1.5, borderColor: color.purpleInk, backgroundColor: color.card },
  bigText: { fontFamily: font.display, fontSize: 18 },

  progressTrack: { height: 10, borderRadius: 5, backgroundColor: color.lavenderSoft, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: color.plum },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  personName: { fontFamily: font.semibold, fontSize: 14, color: color.ink },
  personSub: { fontFamily: font.regular, fontSize: 12, color: color.muted },

  reviewCard: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 18,
    gap: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewTitle: { fontFamily: font.display, fontSize: 20, color: color.ink },
  sentimentRow: { flexDirection: 'row', gap: 8 },
  sentiment: { flex: 1, borderRadius: radius.input, paddingVertical: 10, alignItems: 'center' },
  sentimentValue: { fontFamily: font.display, fontSize: 22 },
  sentimentLabel: { fontFamily: font.medium, fontSize: 12 },
});
