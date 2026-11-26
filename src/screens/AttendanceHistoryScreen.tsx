// src/screens/AttendanceHistoryScreen.tsx
// Rekap Hadir praktikan (redesign): persentase kehadiran dan status setiap sesi yang diikuti.
// Sesi yang belum dibuka dan belum lewat tidak dihitung.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { PillTone, StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import { useMyAttendances } from '../hooks/useAttendanceData';
import { listenPermissionsByPraktikan, PermissionRecord } from '../services/permissionService';
import { color, font, radius } from '../theme/tokens';
import { labelHari, toLocalDate } from '../utils/dateId';
import { formatJam } from '../utils/formatTime';

type Status = 'HADIR' | 'IZIN' | 'ALPA' | 'BERLANGSUNG';

const STATUS: Record<Status, { label: string; tone: PillTone }> = {
  HADIR: { label: 'Hadir', tone: 'success' },
  IZIN: { label: 'Izin', tone: 'warning' },
  ALPA: { label: 'Tidak hadir', tone: 'danger' },
  BERLANGSUNG: { label: 'Presensi dibuka', tone: 'info' },
};

export default function AttendanceHistoryScreen() {
  const { currentUser, sessions } = useApp();
  const uid = currentUser?.id;
  const { data: attendances, loading, error } = useMyAttendances(uid);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenPermissionsByPraktikan(uid, setPermissions);
  }, [uid]);

  const rows = useMemo(() => {
    if (!uid) return [];
    const now = new Date();
    return sessions
      .filter((s) => s.enrolledStudents?.includes(uid))
      .map((s) => {
        const attendance = attendances.find((a) => a.sessionId === s.id);
        const izin = permissions.some((p) => p.sessionId === s.id && p.status === 'DITERIMA');
        const end = toLocalDate(s.tanggal, s.jamSelesai);
        let status: Status | null = null;
        if (attendance) status = 'HADIR';
        else if (izin) status = 'IZIN';
        else if (s.status === 'DITUTUP' || (end && end < now && s.status !== 'DIBUKA')) status = 'ALPA';
        else if (s.status === 'DIBUKA') status = 'BERLANGSUNG';
        return { s, attendance, status };
      })
      .filter((r): r is typeof r & { status: Status } => r.status !== null)
      .sort((a, b) => `${b.s.tanggal} ${b.s.jamMulai}`.localeCompare(`${a.s.tanggal} ${a.s.jamMulai}`));
  }, [sessions, uid, attendances, permissions]);

  const counted = rows.filter((r) => r.status !== 'BERLANGSUNG');
  const hadir = counted.filter((r) => r.status === 'HADIR').length;
  const izin = counted.filter((r) => r.status === 'IZIN').length;
  const alpa = counted.filter((r) => r.status === 'ALPA').length;
  const percent = counted.length === 0 ? 0 : Math.round((hadir / counted.length) * 100);

  return (
    <DecoratedScreen title="Rekap Hadir" tone="praktikan">
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Kehadiranmu</Text>
        <Text style={styles.summaryValue}>{percent}%</Text>
        <View style={styles.track} accessibilityLabel={`Kehadiran ${percent} persen`}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.counts}>
          <Count label="Hadir" value={hadir} />
          <Count label="Izin" value={izin} />
          <Count label="Tidak hadir" value={alpa} />
        </View>
      </View>

      <Text style={styles.section}>Per Sesi</Text>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : !loading && rows.length === 0 ? (
        <Text style={styles.helper}>Belum ada sesi yang dihitung. Rekap muncul setelah sesi dibuka atau selesai.</Text>
      ) : (
        rows.map(({ s, attendance, status }) => {
          const d = toLocalDate(s.tanggal, s.jamMulai);
          const st = STATUS[status];
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => router.push(`/sesi/${s.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.title} numberOfLines={1}>{s.praktikum}</Text>
                <StatusPill label={st.label} tone={st.tone} />
              </View>
              <Text style={styles.sub}>
                {d ? labelHari(d) : s.tanggal} · {s.jamMulai} · Kelas {s.kelas} · P{s.pertemuan}
              </Text>
              {attendance && (
                <Text style={styles.sub}>
                  Presensi {formatJam(attendance.waktu)}
                  {attendance.jarakMeter != null ? ` · ${Math.round(attendance.jarakMeter)} m dari lab` : ''}
                </Text>
              )}
            </Pressable>
          );
        })
      )}
    </DecoratedScreen>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  summary: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 20,
    gap: 6,
  },
  summaryLabel: { fontFamily: font.medium, fontSize: 14, color: color.inkSoft },
  summaryValue: { fontFamily: font.display, fontSize: 48, lineHeight: 54, color: color.plum },
  track: { height: 12, borderRadius: 6, backgroundColor: color.lavenderSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: color.plum },
  counts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  count: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.input, backgroundColor: color.surface },
  countValue: { fontFamily: font.display, fontSize: 22, color: color.ink },
  countLabel: { fontFamily: font.medium, fontSize: 12, color: color.muted },

  section: { fontFamily: font.display, fontSize: 22, color: color.ink, marginTop: 4 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  error: { fontFamily: font.medium, fontSize: 13, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 12 },
  card: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 16,
    gap: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: font.display, fontSize: 20, color: color.ink },
  sub: { fontFamily: font.regular, fontSize: 12, color: color.muted },
});
