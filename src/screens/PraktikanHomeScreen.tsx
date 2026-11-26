// src/screens/PraktikanHomeScreen.tsx
// Beranda praktikan (redesign, Figma: "Home Screen Praktikan").
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/ui/BottomNav';
import { GreetingHeader } from '../components/ui/GreetingHeader';
import { HeroCard } from '../components/ui/HeroCard';
import { MenuGrid, MenuItem } from '../components/ui/MenuTile';
import { PracticumCard } from '../components/ui/PracticumCard';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { useMyAttendances } from '../hooks/useAttendanceData';
import { useLabs } from '../hooks/useLabs';
import { useNow } from '../hooks/useNow';
import { findLabForSession } from '../services/labService';
import { color, font, layout, radius } from '../theme/tokens';
import { Session } from '../types';
import { isSameDay, labelHari, namaHari, tanggalPendek, toLocalDate } from '../utils/dateId';

export default function PraktikanHomeScreen() {
  const { unreadCount } = useNotifications();
  const { currentUser, sessions } = useApp();
  const { labs } = useLabs();
  const { data: myAttendances } = useMyAttendances(currentUser?.id);
  const now = useNow();

  const attended = useMemo(() => new Set(myAttendances.map((a) => a.sessionId)), [myAttendances]);

  // Sesi yang diikuti dan belum selesai, urut dari yang paling dekat.
  const upcoming = useMemo(() => {
    const uid = currentUser?.id ?? '';
    return sessions
      .filter((s) => s.enrolledStudents?.includes(uid))
      .map((s) => ({ s, start: toLocalDate(s.tanggal, s.jamMulai), end: toLocalDate(s.tanggal, s.jamSelesai) }))
      .filter((x) => x.s.status === 'DIBUKA' || (x.end ? x.end > now : true))
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  }, [sessions, currentUser?.id, now]);

  const openSessions = upcoming.filter((x) => x.s.status === 'DIBUKA' && !attended.has(x.s.id));
  const todays = upcoming.filter((x) => x.start && isSameDay(x.start, now));

  function goPresensi() {
    if (openSessions.length === 1) {
      router.push(`/presensi/${openSessions[0].s.id}`);
    } else if (openSessions.length > 1) {
      router.push('/praktikan/jadwal');
    } else {
      Alert.alert('Belum ada sesi dibuka', 'Presensi bisa dilakukan setelah asisten membuka sesi praktikum.');
    }
  }

  const menu: MenuItem[] = [
    { key: 'presensi', label: 'Presensi', icon: 'presensi', onPress: goPresensi },
    { key: 'jadwal', label: 'Lihat Jadwal', icon: 'jadwal', onPress: () => router.push('/praktikan/jadwal') },
    { key: 'izin', label: 'Perizinan', icon: 'perizinan', onPress: () => router.push('/praktikan/izin') },
    { key: 'rekap', label: 'Rekap Hadir', icon: 'rekap', onPress: () => router.push('/praktikan/riwayat') },
    { key: 'ulasan', label: 'Ulasan', icon: 'ulasan', onPress: () => router.push('/ulasan') },
    { key: 'peta', label: 'Peta', icon: 'peta', onPress: () => router.push('/peta') },
  ];

  // Isi kartu oranye.
  const firstToday = todays[0]?.s;
  const hero = openSessions[0]
    ? { summary: 'Sesi sudah dibuka: ', highlight: openSessions[0].s.praktikum, action: 'Presensi sekarang', onAction: goPresensi }
    : firstToday
      ? { summary: 'Hari ini, ada ', highlight: firstToday.praktikum, action: 'Lihat jadwal', onAction: () => router.push('/praktikan/jadwal') }
      : { summary: 'Hari ini tidak ada praktikum.', highlight: undefined, action: 'Lihat jadwal', onAction: () => router.push('/praktikan/jadwal') };

  function locationOf(session: Session) {
    const lab = findLabForSession(session, labs);
    return lab ? `${lab.nama}, ${lab.gedung}` : session.ruang;
  }

  const header = (
    <View>
      <GreetingHeader
        name={currentUser?.nama ?? ''}
        subtitle={`NIM.${currentUser?.nim ?? '-'}`}
        onBellPress={() => router.push('/notifikasi')}
        badge={unreadCount}
      />
      <HeroCard
        dayLabel={namaHari(now)}
        dateLabel={tanggalPendek(now)}
        summary={hero.summary}
        highlight={hero.highlight}
        actionLabel={hero.action}
        onAction={hero.onAction}
      />
      <View style={styles.menu}>
        <MenuGrid items={menu} />
      </View>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Praktikum mendatang</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={upcoming}
        keyExtractor={(x) => x.s.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: { s, start } }) => (
          <PracticumCard
            title={s.praktikum}
            location={locationOf(s)}
            timeLabel={`${start ? labelHari(start, now) : s.tanggal} · ${s.jamMulai}–${s.jamSelesai} · Kelas ${s.kelas}`}
            status={s.status}
            note={attended.has(s.id) ? 'Sudah hadir' : undefined}
            primary={{ label: 'Lihat Presensi', onPress: () => router.push(`/presensi/${s.id}`) }}
            secondary={{ label: 'Detil Sesi', onPress: () => router.push(`/sesi/${s.id}`) }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Belum ada praktikum</Text>
            <Text style={styles.emptyText}>Sesi akan muncul di sini setelah asisten mendaftarkanmu.</Text>
          </View>
        }
      />
      <BottomNav active="home" onHome={() => {}} onProfile={() => router.push('/profil')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 12,
    paddingBottom: layout.bottomNavSpace,
  },
  menu: { marginTop: 20 },
  divider: {
    height: 2,
    backgroundColor: color.purple,
    marginHorizontal: 12,
    marginTop: 24,
    borderRadius: 1,
  },
  sectionTitle: { fontFamily: font.display, fontSize: 16, color: color.ink, marginTop: 18, marginBottom: 12, marginLeft: 4 },
  empty: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: color.lavender,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  emptyText: { fontFamily: font.regular, fontSize: 13, color: color.muted, textAlign: 'center' },
});
