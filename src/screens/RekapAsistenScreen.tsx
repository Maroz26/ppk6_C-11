// src/screens/RekapAsistenScreen.tsx
// Rekap Hadir untuk asisten (redesign): daftar sesi yang kamu buat beserta jumlah hadirnya.
// Menekan kartu membuka Detail Sesi yang berisi daftar hadir lengkap.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { Hills } from '../components/ui/Hills';
import { useApp } from '../context/AppContext';
import { useAllAttendances } from '../hooks/useAttendanceData';
import { useLabs } from '../hooks/useLabs';
import { findLabForSession } from '../services/labService';
import { color, font, radius, sessionStatusColor } from '../theme/tokens';
import { Session } from '../types';
import { labelHari, toLocalDate } from '../utils/dateId';

const FIGMA_WIDTH = 402;
const DECOR_TOP = 470;

function RekapCard({ session, location, hadir, onPress }: {
  session: Session;
  location: string;
  hadir: number;
  onPress: () => void;
}) {
  const total = (session.enrolledStudents ?? []).length;
  const percent = total === 0 ? 0 : Math.round((hadir / total) * 100);
  const start = toLocalDate(session.tanggal, session.jamMulai);
  const badge = sessionStatusColor[session.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.praktikum}, ${hadir} dari ${total} hadir`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={16} color={color.inkSoft} />
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{session.praktikum}</Text>
      <Text style={styles.meta}>
        {start ? labelHari(start) : session.tanggal} · {session.jamMulai} · Kelas {session.kelas} · P{session.pertemuan}
      </Text>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.count}>{hadir}/{total}</Text>
      </View>
    </Pressable>
  );
}

export default function RekapAsistenScreen() {
  const { sessions, currentUser, role } = useApp();
  const { labs } = useLabs();
  const isAsisten = role === 'ASISTEN';
  const { data: attendances, loading, error } = useAllAttendances(isAsisten);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;

  const uid = currentUser?.id ?? '';

  // Jumlah hadir per sesi.
  const hadirBySession = useMemo(() => {
    const map = new Map<string, number>();
    attendances.forEach((a) => map.set(a.sessionId, (map.get(a.sessionId) ?? 0) + 1));
    return map;
  }, [attendances]);

  // Sesi milik asisten yang sudah dibuka atau sudah ditutup, terbaru di atas.
  const list = useMemo(
    () =>
      sessions
        .filter((s) => s.dibuatOleh === uid && s.status !== 'BELUM_DIBUKA')
        .sort((a, b) => `${b.tanggal} ${b.jamMulai}`.localeCompare(`${a.tanggal} ${a.jamMulai}`)),
    [sessions, uid],
  );

  const summary = useMemo(() => {
    let hadir = 0;
    let total = 0;
    list.forEach((s) => {
      hadir += hadirBySession.get(s.id) ?? 0;
      total += (s.enrolledStudents ?? []).length;
    });
    return { percent: total === 0 ? 0 : Math.round((hadir / total) * 100), sesi: list.length };
  }, [list, hadirBySession]);

  function locationOf(session: Session) {
    const lab = findLabForSession(session, labs);
    return lab ? `${lab.nama}, ${lab.gedung}` : session.ruang;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.decor, { top: DECOR_TOP * k }]} pointerEvents="none">
        <Hills preset="awan" />
        <View style={styles.decorWhite} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader title="Rekap Hadir" variant="onLavender" />

        {!isAsisten ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Halaman ini hanya untuk asisten.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryValue}>{summary.percent}%</Text>
              <Text style={styles.summaryText}>
                rata-rata kehadiran dari {summary.sesi} sesi yang sudah dibuka
              </Text>
            </View>

            {error ? (
              <View style={styles.emptyCard} accessibilityRole="alert">
                <Text style={styles.emptyTitle}>Data kehadiran gagal dimuat</Text>
                <Text style={styles.emptyText}>{error}</Text>
              </View>
            ) : list.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Belum ada rekap</Text>
                <Text style={styles.emptyText}>Rekap muncul setelah kamu membuka presensi pada sesi yang kamu buat.</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {list.map((s) => (
                  <RekapCard
                    key={s.id}
                    session={s}
                    location={locationOf(s)}
                    hadir={loading ? 0 : hadirBySession.get(s.id) ?? 0}
                    onPress={() => router.push(`/sesi/${s.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.lavender },
  decor: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  decorWhite: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: 17, paddingTop: 12 },
  pressed: { opacity: 0.85 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 22,
    marginBottom: 16,
    marginHorizontal: 18,
  },
  summaryValue: { fontFamily: font.display, fontSize: 44, color: color.plum },
  summaryText: { flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.purpleInk },

  list: { gap: 13, paddingHorizontal: 18 },
  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: { flex: 1, fontFamily: font.regular, fontSize: 12, color: color.inkSoft },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: color.inkSoft },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: color.lavenderSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: color.plum },
  count: { fontFamily: font.semibold, fontSize: 14, color: color.ink, minWidth: 44, textAlign: 'right' },

  emptyCard: { marginHorizontal: 18, marginTop: 22, padding: 22, gap: 4, borderRadius: radius.card, backgroundColor: color.card },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  emptyText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft },
});
