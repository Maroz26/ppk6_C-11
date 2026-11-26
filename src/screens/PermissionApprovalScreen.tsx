// src/screens/PermissionApprovalScreen.tsx
// Perizinan asisten (redesign): pengajuan izin untuk sesi yang kamu buat.
// Tab "Menunggu" berisi tombol Terima/Tolak dengan konfirmasi; tab "Sudah diputuskan" untuk riwayat.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import { decidePermission, listenPermissionsForAssistant, PermissionRecord } from '../services/permissionService';
import { color, font, radius } from '../theme/tokens';
import { labelHari, toLocalDate } from '../utils/dateId';
import { formatTanggal } from '../utils/formatTime';

type Tab = 'MENUNGGU' | 'SELESAI';
type Pending = { permission: PermissionRecord; status: 'DITERIMA' | 'DITOLAK' };

export default function PermissionApprovalScreen() {
  const { currentUser, sessions, role } = useApp();
  const [requests, setRequests] = useState<PermissionRecord[]>([]);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('MENUNGGU');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const uid = currentUser?.id;
  useEffect(() => {
    if (!uid) return undefined;
    return listenPermissionsForAssistant(
      uid,
      sessions,
      (rows) => {
        setRequests(rows);
        setLoadError('');
      },
      () => setLoadError('Pengajuan izin gagal dimuat.'),
    );
  }, [uid, sessions]);

  const waiting = useMemo(() => requests.filter((r) => r.status === 'MENUNGGU'), [requests]);
  const decided = useMemo(() => requests.filter((r) => r.status !== 'MENUNGGU'), [requests]);
  const list = tab === 'MENUNGGU' ? waiting : decided;

  async function decide() {
    if (!pending || !uid) return;
    setBusy(true);
    setError('');
    try {
      await decidePermission(pending.permission.id, pending.status, uid);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Keputusan izin gagal disimpan.');
    } finally {
      setBusy(false);
    }
  }

  if (role !== 'ASISTEN') {
    return (
      <DecoratedScreen title="Perizinan" tone="asisten">
        <Text style={styles.helper}>Halaman ini hanya untuk asisten.</Text>
      </DecoratedScreen>
    );
  }

  return (
    <DecoratedScreen title="Perizinan" tone="asisten">
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['MENUNGGU', 'SELESAI'] as Tab[]).map((t) => {
          const active = tab === t;
          const count = t === 'MENUNGGU' ? waiting.length : decided.length;
          return (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t)}
              style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t === 'MENUNGGU' ? 'Menunggu' : 'Sudah diputuskan'} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!!loadError && <Text style={styles.error} accessibilityRole="alert">{loadError}</Text>}

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {tab === 'MENUNGGU' ? 'Tidak ada pengajuan yang menunggu' : 'Belum ada keputusan'}
          </Text>
          <Text style={styles.helper}>Pengajuan izin untuk sesi yang kamu buat akan muncul di sini.</Text>
        </View>
      ) : (
        list.map((r) => {
          const s = sessions.find((x) => x.id === r.sessionId);
          const d = s ? toLocalDate(s.tanggal, s.jamMulai) : null;
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.nama.trim().charAt(0).toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>{r.nama}</Text>
                  <Text style={styles.sub}>NIM {r.nim}</Text>
                </View>
                {r.status !== 'MENUNGGU' && (
                  <StatusPill
                    label={r.status === 'DITERIMA' ? 'Diterima' : 'Ditolak'}
                    tone={r.status === 'DITERIMA' ? 'success' : 'danger'}
                  />
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!s}
                onPress={() => s && router.push(`/sesi/${s.id}`)}
                style={({ pressed }) => [styles.sessionBox, pressed && styles.pressed]}
              >
                <Text style={styles.sessionTitle} numberOfLines={1}>{s ? s.praktikum : 'Sesi tidak ditemukan'}</Text>
                {s && (
                  <Text style={styles.sub}>
                    {d ? labelHari(d) : s.tanggal} · {s.jamMulai} · Kelas {s.kelas} · P{s.pertemuan}
                  </Text>
                )}
              </Pressable>

              <Text style={styles.reasonLabel}>Alasan</Text>
              <Text style={styles.reason}>{r.alasan}</Text>
              <Text style={styles.date}>
                Diajukan {formatTanggal(r.diajukanPada)}
                {r.diputuskanPada ? ` · Diputuskan ${formatTanggal(r.diputuskanPada)}` : ''}
              </Text>

              {r.status === 'MENUNGGU' && (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setError('');
                      setPending({ permission: r, status: 'DITOLAK' });
                    }}
                    style={({ pressed }) => [styles.action, styles.reject, pressed && styles.pressed]}
                  >
                    <Text style={styles.rejectText}>Tolak</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setError('');
                      setPending({ permission: r, status: 'DITERIMA' });
                    }}
                    style={({ pressed }) => [styles.action, styles.accept, pressed && styles.pressed]}
                  >
                    <Text style={styles.acceptText}>Terima</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}

      <ConfirmDialog
        visible={!!pending}
        title={pending?.status === 'DITERIMA' ? 'Terima izin?' : 'Tolak izin?'}
        message={pending ? `${pending.permission.nama} (${pending.permission.nim}). Keputusan tidak dapat diubah setelah disimpan.` : ''}
        confirmLabel={pending?.status === 'DITERIMA' ? 'Terima' : 'Tolak'}
        danger={pending?.status === 'DITOLAK'}
        busy={busy}
        error={error}
        onConfirm={decide}
        onCancel={() => !busy && setPending(null)}
      />
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  tabActive: { backgroundColor: color.plum },
  tabText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },
  tabTextActive: { color: color.onDark },
  error: { fontFamily: font.medium, fontSize: 13, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 12 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  empty: { backgroundColor: color.card, borderRadius: radius.card, padding: 22, gap: 4 },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },

  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 18,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.mint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.display, fontSize: 18, color: color.ink },
  name: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
  sub: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  sessionBox: { backgroundColor: color.surface, borderRadius: radius.input, padding: 12, marginTop: 6, gap: 2 },
  sessionTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  reasonLabel: { fontFamily: font.medium, fontSize: 12, color: color.muted, marginTop: 6 },
  reason: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },
  date: { fontFamily: font.regular, fontSize: 11, color: color.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  action: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  reject: { borderWidth: 1.5, borderColor: color.danger, backgroundColor: color.card },
  rejectText: { fontFamily: font.semibold, fontSize: 14, color: color.danger },
  accept: { backgroundColor: color.plum },
  acceptText: { fontFamily: font.semibold, fontSize: 14, color: color.onDark },
});
