// src/screens/AsistenHomeScreen.tsx
// Beranda asisten (redesign, Figma: "Home Screen Asprak").
// Latar oranye, kartu mint, maskot berkacamata, tombol + di navigasi untuk menambah sesi.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/ui/BottomNav';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { GreetingHeader } from '../components/ui/GreetingHeader';
import { HeroCard } from '../components/ui/HeroCard';
import { MenuGrid, MenuItem } from '../components/ui/MenuTile';
import { PracticumCard } from '../components/ui/PracticumCard';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { useNow } from '../hooks/useNow';
import { findLabForSession } from '../services/labService';
import { setSessionStatus } from '../services/sessionControlService';
import { color, font, layout, radius, roleTheme } from '../theme/tokens';
import { Session } from '../types';
import { isSameDay, labelHari, namaHari, tanggalPendek, toLocalDate } from '../utils/dateId';

const theme = roleTheme.asisten;

type Pending = { session: Session; next: 'DIBUKA' | 'DITUTUP' } | null;

export default function AsistenHomeScreen() {
  const { currentUser, sessions } = useApp();
  const { labs } = useLabs();
  const now = useNow();

  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Sesi yang dibuat asisten ini dan belum selesai, urut dari yang paling dekat.
  const upcoming = useMemo(() => {
    const uid = currentUser?.id ?? '';
    return sessions
      .filter((s) => s.dibuatOleh === uid)
      .map((s) => ({ s, start: toLocalDate(s.tanggal, s.jamMulai), end: toLocalDate(s.tanggal, s.jamSelesai) }))
      .filter((x) => x.s.status === 'DIBUKA' || (x.end ? x.end > now : true))
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  }, [sessions, currentUser?.id, now]);

  const todays = upcoming.filter((x) => x.start && isSameDay(x.start, now));
  const openToday = todays.find((x) => x.s.status === 'DIBUKA')?.s;
  const nextToday = todays.find((x) => x.s.status === 'BELUM_DIBUKA')?.s;

  function askStatus(session: Session, next: 'DIBUKA' | 'DITUTUP') {
    setActionError('');
    setPending({ session, next });
  }

  async function confirmStatus() {
    if (!pending || !currentUser) return;
    setBusy(true);
    setActionError('');
    try {
      await setSessionStatus(pending.session.id, pending.next, currentUser.id);
      setPending(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Status sesi gagal diperbarui. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  // Sementara: Kelola Sesi & Rekap masih memakai halaman lama sampai halaman barunya dibuat.
  const menu: MenuItem[] = [
    { key: 'kelola', label: 'Kelola Sesi', feather: 'edit-3', onPress: () => router.push('/asisten/jadwal') },
    { key: 'jadwal', label: 'Jadwal', icon: 'jadwal', onPress: () => router.push('/asisten/jadwal') },
    { key: 'izin', label: 'Perizinan', icon: 'perizinan', onPress: () => router.push('/asisten/izin') },
    { key: 'rekap', label: 'Rekap Hadir', icon: 'rekap', onPress: () => router.push('/asisten/jadwal') },
    { key: 'ulasan', label: 'Ulasan', icon: 'ulasan', onPress: () => router.push('/ulasan') },
    { key: 'lab', label: 'Kelola Lab', icon: 'peta', onPress: () => router.push('/asisten/lab') },
  ];

  // Isi kartu mint.
  const hero = openToday
    ? { summary: 'Presensi sedang dibuka: ', highlight: openToday.praktikum, action: 'Lihat kehadiran', onAction: () => router.push(`/rekap/${openToday.id}`) }
    : nextToday
      ? { summary: 'Hari ini, kamu mengajar ', highlight: nextToday.praktikum, action: 'Buka presensi', onAction: () => askStatus(nextToday, 'DIBUKA') }
      : { summary: 'Hari ini tidak ada jadwal mengajar.', highlight: undefined, action: 'Lihat jadwal', onAction: () => router.push('/asisten/jadwal') };

  function locationOf(session: Session) {
    const lab = findLabForSession(session, labs);
    return lab ? `${lab.nama}, ${lab.gedung}` : session.ruang;
  }

  function primaryAction(session: Session) {
    if (session.status === 'BELUM_DIBUKA') return { label: 'Buka Presensi', onPress: () => askStatus(session, 'DIBUKA') };
    if (session.status === 'DIBUKA') return { label: 'Tutup Presensi', onPress: () => askStatus(session, 'DITUTUP') };
    return { label: 'Lihat Rekap', onPress: () => router.push(`/rekap/${session.id}`) };
  }

  const header = (
    <View>
      <GreetingHeader
        tone="asisten"
        name={currentUser?.nama ?? ''}
        subtitle={`NIM.${currentUser?.nim ?? '-'}`}
        onBellPress={() => router.push('/asisten/izin')}
      />
      <HeroCard
        variant="asisten"
        dayLabel={namaHari(now)}
        dateLabel={tanggalPendek(now)}
        summary={hero.summary}
        highlight={hero.highlight}
        actionLabel={hero.action}
        onAction={hero.onAction}
      />
      <View style={styles.menu}>
        <MenuGrid tone="asisten" items={menu} />
      </View>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Sesi yang kamu ampu</Text>
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
            tone="asisten"
            title={s.praktikum}
            location={locationOf(s)}
            timeLabel={`${start ? labelHari(start, now) : s.tanggal} · ${s.jamMulai}–${s.jamSelesai} · Kelas ${s.kelas}`}
            status={s.status}
            primary={primaryAction(s)}
            secondary={{ label: 'Detil Sesi', onPress: () => router.push(`/sesi/${s.id}`) }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Belum ada sesi</Text>
            <Text style={styles.emptyText}>Tekan tombol + di bawah untuk membuat sesi praktikum.</Text>
          </View>
        }
      />

      <BottomNav
        tone="asisten"
        active="home"
        mascotPlus
        onHome={() => {}}
        onProfile={() => router.push('/profil')}
        onMascot={() => router.push('/sesi/form')}
      />

      <ConfirmDialog
        visible={!!pending}
        title={pending?.next === 'DIBUKA' ? 'Buka presensi?' : 'Tutup presensi?'}
        message={
          pending
            ? pending.next === 'DIBUKA'
              ? `Praktikan ${pending.session.praktikum} kelas ${pending.session.kelas} dapat mulai presensi setelah sesi dibuka.`
              : `Praktikan tidak dapat presensi lagi setelah sesi ${pending.session.praktikum} ditutup. Sesi yang ditutup tidak dapat dibuka kembali.`
            : ''
        }
        confirmLabel={pending?.next === 'DIBUKA' ? 'Buka' : 'Tutup'}
        danger={pending?.next === 'DITUTUP'}
        busy={busy}
        error={actionError}
        onConfirm={confirmStatus}
        onCancel={() => !busy && setPending(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.page },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 12,
    paddingBottom: layout.bottomNavSpace,
  },
  menu: { marginTop: 20 },
  divider: {
    height: 2,
    backgroundColor: theme.divider,
    marginHorizontal: 12,
    marginTop: 24,
    borderRadius: 1,
  },
  sectionTitle: { fontFamily: font.display, fontSize: 16, color: theme.sectionTitle, marginTop: 18, marginBottom: 12, marginLeft: 4 },
  empty: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: theme.cardBorder,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  emptyText: { fontFamily: font.regular, fontSize: 13, color: color.muted, textAlign: 'center' },
});
