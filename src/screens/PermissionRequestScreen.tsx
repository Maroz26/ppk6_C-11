// src/screens/PermissionRequestScreen.tsx
// Perizinan praktikan (redesign): ajukan izin untuk satu sesi, lalu lihat riwayat dan keputusannya.
// Bisa dibuka dengan ?sessionId=... (dari Detail Sesi) supaya sesinya langsung terpilih.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import { useMyAttendances } from '../hooks/useAttendanceData';
import { createPermission, listenPermissionsByPraktikan, PermissionRecord } from '../services/permissionService';
import { color, font, radius } from '../theme/tokens';
import { Session } from '../types';
import { labelHari, toLocalDate } from '../utils/dateId';
import { formatTanggal } from '../utils/formatTime';

const STATUS = {
  MENUNGGU: { label: 'Menunggu', tone: 'info' },
  DITERIMA: { label: 'Diterima', tone: 'success' },
  DITOLAK: { label: 'Ditolak', tone: 'danger' },
} as const;

function sessionLine(s: Session) {
  const d = toLocalDate(s.tanggal, s.jamMulai);
  return `${d ? labelHari(d) : s.tanggal} · ${s.jamMulai} · Kelas ${s.kelas}`;
}

export default function PermissionRequestScreen() {
  const { sessionId: initialId } = useLocalSearchParams<{ sessionId?: string }>();
  const { currentUser, sessions } = useApp();
  const uid = currentUser?.id;
  const { data: myAttendances } = useMyAttendances(uid);
  const [history, setHistory] = useState<PermissionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [reason, setReason] = useState('');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) return undefined;
    return listenPermissionsByPraktikan(uid, setHistory);
  }, [uid]);

  // Sesi yang bisa diajukan izin: diikuti, belum ditutup, belum hadir,
  // dan belum punya pengajuan yang menunggu atau diterima.
  const available = useMemo(() => {
    if (!uid) return [];
    const attended = new Set(myAttendances.map((a) => a.sessionId));
    const requested = new Set(history.filter((h) => h.status !== 'DITOLAK').map((h) => h.sessionId));
    return sessions
      .filter((s) => s.enrolledStudents?.includes(uid))
      .filter((s) => s.status !== 'DITUTUP' && !attended.has(s.id) && !requested.has(s.id))
      .sort((a, b) => `${a.tanggal} ${a.jamMulai}`.localeCompare(`${b.tanggal} ${b.jamMulai}`));
  }, [sessions, uid, myAttendances, history]);

  const selected = available.find((s) => s.id === selectedId) ?? null;

  async function submit() {
    setFeedback('');
    setError('');
    if (!currentUser) {
      setError('Sesi login berakhir. Silakan login ulang.');
      return;
    }
    if (!selected) {
      setError('Pilih sesi praktikum terlebih dahulu.');
      return;
    }
    if (!reason.trim()) {
      setError('Alasan ketidakhadiran wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      await createPermission({
        sessionId: selected.id,
        praktikanId: currentUser.id,
        nama: currentUser.nama,
        nim: currentUser.nim,
        alasan: reason,
      });
      setReason('');
      setSelectedId(null);
      setFeedback('Pengajuan terkirim. Tunggu keputusan asisten di riwayat di bawah.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pengajuan izin gagal dikirim.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DecoratedScreen title="Perizinan" tone="praktikan">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ajukan Izin</Text>

        <Text style={styles.label}>Sesi praktikum</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sesi praktikum: ${selected ? selected.praktikum : 'belum dipilih'}`}
          onPress={() => setPicker(true)}
          style={({ pressed }) => [styles.select, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={[styles.selectText, !selected && styles.placeholder]} numberOfLines={1}>
              {selected ? selected.praktikum : 'Pilih sesi'}
            </Text>
            {selected && <Text style={styles.selectSub}>{sessionLine(selected)}</Text>}
          </View>
          <Feather name="chevron-down" size={18} color={color.purpleInk} />
        </Pressable>

        <Text style={styles.label}>Alasan</Text>
        <TextInput
          accessibilityLabel="Alasan ketidakhadiran"
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            setError('');
          }}
          placeholder="Contoh: sakit, ada surat dokter"
          placeholderTextColor={color.placeholder}
          selectionColor={color.purpleDeep}
          multiline
          textAlignVertical="top"
          style={styles.reason}
        />

        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        {!!feedback && <Text style={styles.success} accessibilityLiveRegion="polite">{feedback}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={submit}
          style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.primaryText}>{busy ? 'Mengirim...' : 'Kirim Pengajuan'}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Riwayat Izin</Text>
      {history.length === 0 ? (
        <Text style={styles.helper}>Belum ada pengajuan izin.</Text>
      ) : (
        history.map((h) => {
          const s = sessions.find((x) => x.id === h.sessionId);
          const st = STATUS[h.status];
          return (
            <Pressable
              key={h.id}
              accessibilityRole="button"
              disabled={!s}
              onPress={() => s && router.push(`/sesi/${s.id}`)}
              style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
            >
              <View style={styles.historyTop}>
                <Text style={styles.historyTitle} numberOfLines={1}>{s ? s.praktikum : 'Sesi tidak ditemukan'}</Text>
                <StatusPill label={st.label} tone={st.tone} />
              </View>
              {s && <Text style={styles.historySub}>{sessionLine(s)}</Text>}
              <Text style={styles.historyReason}>{h.alasan}</Text>
              <Text style={styles.historyDate}>
                Diajukan {formatTanggal(h.diajukanPada)}
                {h.diputuskanPada ? ` · Diputuskan ${formatTanggal(h.diputuskanPada)}` : ''}
              </Text>
            </Pressable>
          );
        })
      )}

      <BottomSheet visible={picker} title="Pilih sesi" onClose={() => setPicker(false)}>
        {available.length === 0 ? (
          <Text style={styles.helper}>
            Tidak ada sesi yang bisa diajukan izin. Sesi yang sudah ditutup, sudah kamu hadiri, atau sudah diajukan tidak ditampilkan.
          </Text>
        ) : (
          <ScrollView style={styles.sheetList}>
            {available.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: s.id === selectedId }}
                onPress={() => {
                  setSelectedId(s.id);
                  setPicker(false);
                  setError('');
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.optionTitle}>{s.praktikum}</Text>
                  <Text style={styles.selectSub}>{sessionLine(s)}</Text>
                </View>
                {s.id === selectedId && <Feather name="check" size={18} color={color.plum} />}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </BottomSheet>
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 20,
    gap: 8,
  },
  cardTitle: { fontFamily: font.display, fontSize: 24, color: color.ink, marginBottom: 4 },
  label: { fontFamily: font.medium, fontSize: 14, color: color.ink, marginTop: 6 },
  select: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
  },
  selectText: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
  selectSub: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  placeholder: { fontFamily: font.regular, fontStyle: 'italic', color: color.placeholder },
  reason: {
    minHeight: 110,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.ink,
  },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 12 },
  success: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.success, backgroundColor: color.successSoft, borderRadius: radius.sm, padding: 12 },
  primary: { minHeight: 52, marginTop: 8, borderRadius: radius.pill, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: font.display, fontSize: 19, color: color.onDark },

  section: { fontFamily: font.display, fontSize: 22, color: color.ink, marginTop: 6 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  historyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: color.lavender,
    padding: 16,
    gap: 4,
  },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyTitle: { flex: 1, fontFamily: font.display, fontSize: 20, color: color.ink },
  historySub: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  historyReason: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkSoft, marginTop: 4 },
  historyDate: { fontFamily: font.regular, fontSize: 11, color: color.muted, marginTop: 4 },

  sheetList: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  optionTitle: { fontFamily: font.semibold, fontSize: 15, color: color.ink },
});
