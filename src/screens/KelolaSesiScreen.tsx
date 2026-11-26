// src/screens/KelolaSesiScreen.tsx
// Halaman Kelola Sesi khusus asisten (redesign, Figma: "Kelola Sesi").
// - Daftar sesi: yang akan datang di atas (paling dekat dulu), yang sudah lewat di bawah.
// - Pilihan "Sesi saya" (yang kamu buat) atau "Semua sesi".
// - Pensil = ubah sesi, tekan kartu = detail sesi, tombol bawah = tambah sesi.
// Menghapus sesi dilakukan dari halaman ubah sesi (hanya pembuat sesi).
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { Hills } from '../components/ui/Hills';
import { ScheduleCard } from '../components/ui/ScheduleCard';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { useNow } from '../hooks/useNow';
import { findLabForSession } from '../services/labService';
import { color, font, radius, shadow } from '../theme/tokens';
import { Session } from '../types';
import { labelHari, toLocalDate } from '../utils/dateId';

type Filter = 'mine' | 'all';

// Posisi hiasan awan dari atas layar (Figma: bukit ungu mulai di y 470 pada frame 402 x 874).
const FIGMA_WIDTH = 402;
const DECOR_TOP = 470;

export default function KelolaSesiScreen() {
  const { sessions, sessionsError, currentUser, role } = useApp();
  const { labs } = useLabs();
  const now = useNow(60000);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  const [filter, setFilter] = useState<Filter>('mine');

  const uid = currentUser?.id ?? '';

  const { upcoming, past } = useMemo(() => {
    const list = filter === 'mine' ? sessions.filter((s) => s.dibuatOleh === uid) : sessions;
    const withTime = list.map((s) => ({ s, end: toLocalDate(s.tanggal, s.jamSelesai), start: toLocalDate(s.tanggal, s.jamMulai) }));
    const isPast = (x: (typeof withTime)[number]) => x.s.status === 'DITUTUP' || (x.end ? x.end < now : false);
    return {
      upcoming: withTime
        .filter((x) => !isPast(x))
        .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)),
      past: withTime
        .filter(isPast)
        .sort((a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0)),
    };
  }, [sessions, filter, uid, now]);

  function locationOf(session: Session) {
    const lab = findLabForSession(session, labs);
    return lab ? `${lab.nama}, ${lab.gedung}` : session.ruang;
  }

  function renderCard(s: Session, start: Date | null) {
    return (
      <ScheduleCard
        key={s.id}
        tone="praktikan" // garis lavender, sesuai Figma Kelola Sesi
        background="white"
        title={s.praktikum}
        location={locationOf(s)}
        timeLabel={`${start ? labelHari(start, now) : s.tanggal} · ${s.jamMulai}`}
        rightLabel={`Kelas ${s.kelas} · P${s.pertemuan}`}
        status={s.status}
        onPress={() => router.push(`/sesi/${s.id}`)}
        onEdit={() => router.push(`/sesi/form?id=${s.id}`)}
      />
    );
  }

  if (role !== 'ASISTEN') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackHeader title="Kelola Sesi" variant="onLavender" />
        </View>
        <Text style={styles.notice}>Halaman ini hanya untuk asisten.</Text>
      </SafeAreaView>
    );
  }

  const empty = upcoming.length === 0 && past.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Latar: lavender di atas, bukit ungu dan awan putih, lalu putih. Tidak ikut bergulir. */}
      <View style={[styles.decor, { top: DECOR_TOP * k }]} pointerEvents="none">
        <Hills preset="awan" />
        <View style={styles.decorWhite} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader title="Kelola Sesi" variant="onLavender" />

        <View style={styles.filters} accessibilityRole="radiogroup">
          {(['mine', 'all'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(f)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f === 'mine' ? 'Sesi saya' : 'Semua sesi'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {sessionsError ? (
          <View style={styles.emptyCard} accessibilityRole="alert">
            <Text style={styles.emptyTitle}>Sesi gagal dimuat</Text>
            <Text style={styles.emptyText}>{sessionsError}</Text>
          </View>
        ) : empty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada sesi</Text>
            <Text style={styles.emptyText}>Tekan Tambah Sesi untuk membuat jadwal praktikum.</Text>
          </View>
        ) : (
          <>
            <View style={styles.list}>{upcoming.map((x) => renderCard(x.s, x.start))}</View>
            {past.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Sudah lewat</Text>
                <View style={styles.list}>{past.map((x) => renderCard(x.s, x.start))}</View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sesi/form')}
          style={({ pressed }) => [styles.addButton, shadow.float, pressed && styles.pressed]}
        >
          <Text style={styles.addText}>+ Tambah Sesi</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.lavender },
  header: { paddingHorizontal: 17, paddingTop: 12 },
  notice: { fontFamily: font.medium, fontSize: 14, color: color.ink, padding: 24 },
  decor: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  decorWhite: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: 17, paddingTop: 12 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 22, marginBottom: 16, paddingHorizontal: 18 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  chipActive: { backgroundColor: color.plum },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },
  chipTextActive: { color: color.onDark },
  pressed: { opacity: 0.8 },
  list: { gap: 13, paddingHorizontal: 18 },
  sectionTitle: { fontFamily: font.display, fontSize: 20, color: color.ink, marginTop: 26, marginBottom: 12, paddingHorizontal: 18 },
  emptyCard: {
    marginHorizontal: 18,
    padding: 22,
    gap: 4,
    borderRadius: radius.card,
    backgroundColor: color.card,
  },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  emptyText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 27 },
  addButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: font.display, fontSize: 20, color: color.onDark },
});
