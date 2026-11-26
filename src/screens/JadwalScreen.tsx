// src/screens/JadwalScreen.tsx
// Halaman Jadwal (redesign, Figma: "jadwal-prak"). Dipakai praktikan dan asisten.
// - Kalender bulanan; tanggal yang punya praktikum diberi titik.
// - Di bawahnya daftar praktikum pada tanggal yang dipilih (awalnya hari ini).
// - Menekan kartu membuka detail sesi.
// Menambah/mengubah/menghapus sesi ada di halaman Kelola Sesi (khusus asisten).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { CalendarMonth } from '../components/ui/CalendarMonth';
import { Hills } from '../components/ui/Hills';
import { ScheduleCard } from '../components/ui/ScheduleCard';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { useNow } from '../hooks/useNow';
import { findLabForSession } from '../services/labService';
import { color, font, radius, RoleTone } from '../theme/tokens';
import { Session } from '../types';
import { isSameDay, labelHari, toIsoDate } from '../utils/dateId';

export default function JadwalScreen() {
  const { sessions, sessionsError, currentUser, role } = useApp();
  const { labs } = useLabs();
  const insets = useSafeAreaInsets();
  const today = useNow(60000);
  const tone: RoleTone = role === 'ASISTEN' ? 'asisten' : 'praktikan';

  const [selected, setSelected] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());

  // Praktikan: hanya sesi yang ia ikuti. Asisten: semua sesi praktikum.
  const visible = useMemo(() => {
    if (tone === 'asisten') return sessions;
    const uid = currentUser?.id ?? '';
    return sessions.filter((s) => s.enrolledStudents?.includes(uid));
  }, [sessions, tone, currentUser?.id]);

  const markedDates = useMemo(() => new Set(visible.map((s) => s.tanggal)), [visible]);

  const daySessions = useMemo(() => {
    const key = toIsoDate(selected);
    return visible
      .filter((s) => s.tanggal === key)
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  }, [visible, selected]);

  function selectDate(date: Date) {
    setSelected(date);
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function changeMonth(delta: -1 | 1) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    // Pilih hari ini kalau ada di bulan itu, selain itu tanggal 1.
    const sameMonthAsToday = next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear();
    setSelected(sameMonthAsToday ? today : next);
  }

  function locationOf(session: Session) {
    const lab = findLabForSession(session, labs);
    return lab ? `${lab.nama}, ${lab.gedung}` : session.ruang;
  }

  const title = isSameDay(selected, today) ? 'Praktikum Hari Ini' : `Praktikum ${labelHari(selected, today)}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          {/* Bukit digambar lebih dulu supaya kalender tampil di atasnya. */}
          <View style={styles.hills} pointerEvents="none">
            <Hills />
          </View>

          <View style={styles.header}>
            <BackHeader title="Jadwal Praktikum" variant="onOrange" />
          </View>

          <View style={styles.calendar}>
            <CalendarMonth
              month={month}
              selected={selected}
              today={today}
              markedDates={markedDates}
              onSelect={selectDate}
              onChangeMonth={changeMonth}
            />
          </View>
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>

          {sessionsError ? (
            <View style={styles.empty} accessibilityRole="alert">
              <Text style={styles.emptyTitle}>Jadwal gagal dimuat</Text>
              <Text style={styles.emptyText}>{sessionsError}</Text>
            </View>
          ) : daySessions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Tidak ada praktikum</Text>
              <Text style={styles.emptyText}>
                Tanggal yang punya praktikum ditandai titik di kalender.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {daySessions.map((s) => (
                <ScheduleCard
                  key={s.id}
                  tone={tone}
                  title={s.praktikum}
                  location={locationOf(s)}
                  timeLabel={`${s.jamMulai} - ${s.jamSelesai}`}
                  rightLabel={`Kelas ${s.kelas} · P${s.pertemuan}`}
                  status={s.status}
                  onPress={() => router.push(`/sesi/${s.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Jarak dari bawah kalender ke bagian cokelat yang rata (Figma: 454 -> 472).
const BELOW_CALENDAR = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.orange },
  // Latar cokelat supaya saat ditarik melewati batas bawah tidak terlihat oranye.
  scroll: { backgroundColor: color.brown },
  scrollContent: { flexGrow: 1 },
  top: { backgroundColor: color.orange, paddingBottom: BELOW_CALENDAR },
  hills: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { paddingHorizontal: 14, paddingTop: 12 },
  calendar: { paddingHorizontal: 26, marginTop: 18 },
  bottom: { flex: 1, backgroundColor: color.brown, paddingHorizontal: 32, paddingTop: 36 },
  sectionTitle: { fontFamily: font.display, fontSize: 25, color: color.onDark, marginBottom: 18 },
  list: { gap: 14 },
  empty: {
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 4,
  },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.onDark },
  emptyText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.onDark },
});
