import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Session } from '../types';

const palette = {
  navy: '#112250',
  sapphire: '#3B507D',
  taupe: '#BEB7A7',
  champagne: '#E7E2CE',
  ivory: '#F5F4F0',
};

type StatusKey = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';

const STATS: {
  key: StatusKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'BELUM_DIBUKA', label: 'Belum Dibuka', icon: 'time-outline' },
  { key: 'DIBUKA', label: 'Sedang Dibuka', icon: 'lock-open-outline' },
  { key: 'DITUTUP', label: 'Ditutup', icon: 'lock-closed-outline' },
];

const statusColors: Record<StatusKey, string> = {
  BELUM_DIBUKA: palette.sapphire,
  DIBUKA: '#426F5A',
  DITUTUP: '#793D4D',
};

export default function AssistantHomeScreen() {
  const { currentUser, sessions, logout, openSession, closeSession } = useApp();
  const [pendingAction, setPendingAction] = useState<{ session: Session; action: 'open' | 'close' } | null>(null);


  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const sessionSource = sessions;
  const sortedSessions = sessionSource
    .filter(session => session.dibuatOleh === currentUser?.id)
    .sort(
      (a, b) =>
        new Date(`${a.tanggal}T${a.jamMulai}`).getTime() -
        new Date(`${b.tanggal}T${b.jamMulai}`).getTime()
    );

  const counts: Record<StatusKey, number> = {
    BELUM_DIBUKA: sortedSessions.filter(session => session.status === 'BELUM_DIBUKA').length,
    DIBUKA: sortedSessions.filter(session => session.status === 'DIBUKA').length,
    DITUTUP: sortedSessions.filter(session => session.status === 'DITUTUP').length,
  };

  const initial = currentUser?.nama?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  // const confirmSessionAction = async () => {
  //   if (!pendingAction || !currentUser) return;
  //   const { session, action } = pendingAction;
  //   try {
  //     if (action === 'open') {
  //       await setSessionStatus(session.id, 'DIBUKA', currentUser.id);
  //       openSession(session.id);
  //     } else {
  //       await setSessionStatus(session.id, 'DITUTUP', currentUser.id);
  //       closeSession(session.id);
  //     }
  //     setPendingAction(null);
  //   } catch (error) {
  //     setPendingAction(null);
  //     Alert.alert(
  //       'Status sesi gagal diperbarui',
  //       error instanceof Error ? error.message : 'Silakan coba lagi.'
  //     );
  //   }
  // };

  const confirmSessionAction = () => {
    if (!pendingAction) return;
    const { session, action } = pendingAction;
    if (action === 'open') openSession(session.id);
    else closeSession(session.id);
    setPendingAction(null);
  };
  
  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeLabel}>Selamat bertugas,</Text>
          <Text style={styles.welcomeText} numberOfLines={1}>{currentUser?.nama}</Text>
          <Text style={styles.subText}>NIM/NIP: {currentUser?.nim}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.btnLogout, pressed && styles.btnLogoutPressed]}>
          <Ionicons name="log-out-outline" size={18} color={palette.ivory} />
          <Text style={styles.btnLogoutText}>Keluar</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Ringkasan Status Sesi</Text>
      <View style={styles.statsContainer}>
        {STATS.map(item => (
          <View key={item.key} style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: item.key === 'DITUTUP' ? '#F0E7E5' : palette.champagne }]}>
              <Ionicons name={item.icon} size={18} color={statusColors[item.key]} />
            </View>
            <Text style={[styles.statNumber, { color: statusColors[item.key] }]}>{counts[item.key]}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Daftar Sesi Praktikum Diampu</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/asisten/izin')}
        style={({ pressed }) => [styles.permissionLink, pressed && styles.btnPressed]}>
        <Ionicons name="document-text-outline" size={17} color={palette.navy} />
        <Text style={styles.permissionLinkText}>Periksa pengajuan izin</Text>
        <Ionicons name="chevron-forward" size={16} color={palette.navy} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sortedSessions}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.sessionCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/sesi/${item.id}`)}
              style={({ pressed }) => [styles.sessionHeading, pressed && styles.btnPressed]}>
              <View style={styles.sessionTop}>
                <Text style={styles.sessionEyebrow}>PRAKTIKUM · KELAS {item.kelas}</Text>
                <View style={[styles.sessionStatus, { backgroundColor: item.status === 'DITUTUP' ? '#F0E7E5' : palette.champagne }]}>
                  <Text style={[styles.sessionStatusText, { color: item.status === 'DITUTUP' ? '#713D46' : palette.navy }]}>
                    {item.status === 'DIBUKA' ? 'Dibuka' : item.status === 'DITUTUP' ? 'Ditutup' : 'Belum Dibuka'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sessionName}>{item.praktikum}</Text>
              <Text style={styles.sessionMetadata}>
                Pertemuan {item.pertemuan} · {item.tanggal} · {item.jamMulai}–{item.jamSelesai}
              </Text>
              <Text style={styles.sessionRoom}>{item.ruang}</Text>
            </Pressable>
            <View style={styles.cardFooter}>
                {item.status !== 'DITUTUP' && (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.btnControl, pressed && styles.btnPressed]}
                    onPress={() => setPendingAction({
                      session: item,
                      action: item.status === 'DIBUKA' ? 'close' : 'open',
                    })}>
                    <Ionicons
                      name={item.status === 'DIBUKA' ? 'lock-closed-outline' : 'lock-open-outline'}
                      size={16}
                      color={palette.navy}
                    />
                    <Text style={styles.btnTextControl}>{item.status === 'DIBUKA' ? 'Tutup Sesi' : 'Buka Sesi'}</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
                  onPress={() => router.push(`/kelola/${item.id}`)}>
                  <Ionicons name="settings-outline" size={16} color={palette.navy} />
                  <Text style={styles.btnTextSecondary}>Kelola</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                  onPress={() => router.push(`/rekap/${item.id}`)}>
                  <Ionicons name="bar-chart-outline" size={16} color={palette.ivory} />
                  <Text style={styles.btnTextPrimary}>Lihat Rekap</Text>
                </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={26} color={palette.taupe} />
            <Text style={styles.emptyTitle}>Tidak ada sesi</Text>
            <Text style={styles.emptyDescription}>Belum ada jadwal praktikum yang Anda ampu.</Text>
          </View>
        }
      />

      <Modal
        visible={pendingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>KONFIRMASI TINDAKAN</Text>
            <Text style={styles.modalTitle}>
              {pendingAction?.action === 'open' ? 'Buka sesi sekarang?' : 'Tutup sesi ini?'}
            </Text>
            <Text style={styles.modalMessage}>
              {pendingAction?.action === 'open'
                ? 'Praktikan dapat melakukan presensi setelah sesi dibuka.'
                : 'Setelah ditutup, praktikan tidak dapat melakukan presensi lagi.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPendingAction(null)}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={confirmSessionAction}>
                <Text style={styles.confirmButtonText}>
                  {pendingAction?.action === 'open' ? 'Buka Sesi' : 'Tutup Sesi'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.navy },
  listContent: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.sapphire,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(245,244,240,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: palette.ivory, fontFamily: 'Inter' },
  userInfo: { flex: 1, marginRight: 8 },
  welcomeLabel: { fontSize: 12, color: palette.champagne, fontFamily: 'Inter' },
  welcomeText: { fontSize: 17, fontWeight: '700', color: palette.ivory, marginTop: 1, fontFamily: 'Inter' },
  subText: { fontSize: 12, color: palette.champagne, marginTop: 2, fontFamily: 'Inter' },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,244,240,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  btnLogoutPressed: { backgroundColor: 'rgba(245,244,240,0.32)' },
  btnLogoutText: { color: palette.ivory, fontWeight: '600', fontSize: 13, fontFamily: 'Inter' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: palette.ivory, marginBottom: 12, fontFamily: 'Inter' },
  permissionLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 12, backgroundColor: palette.champagne, marginBottom: 12 },
  permissionLinkText: { flex: 1, color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: palette.ivory,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.taupe,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNumber: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter' },
  statLabel: { fontSize: 10, color: palette.sapphire, marginTop: 2, textAlign: 'center', fontFamily: 'Inter' },
  sessionCard: { backgroundColor: palette.ivory, borderWidth: 1, borderColor: palette.taupe, borderRadius: 18, padding: 15, marginBottom: 12 },
  sessionHeading: { paddingBottom: 13 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sessionEyebrow: { flex: 1, color: palette.sapphire, fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  sessionStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 15 },
  sessionStatusText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '700' },
  sessionName: { color: palette.navy, fontFamily: 'Inter', fontSize: 16, fontWeight: '700', marginTop: 9 },
  sessionMetadata: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 6 },
  sessionRoom: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 3 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.navy,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnPrimaryPressed: { backgroundColor: palette.sapphire },
  btnTextPrimary: { color: palette.ivory, fontWeight: '600', fontSize: 11, fontFamily: 'Inter' },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.champagne,
    borderWidth: 1,
    borderColor: palette.taupe,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnPressed: { opacity: 0.75 },
  btnTextSecondary: { color: palette.navy, fontWeight: '600', fontSize: 11, fontFamily: 'Inter' },
  btnControl: {
    width: '100%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.champagne,
    borderWidth: 1,
    borderColor: palette.taupe,
    paddingVertical: 9,
    borderRadius: 12,
  },
  btnTextControl: { color: palette.navy, fontWeight: '700', fontSize: 11, fontFamily: 'Inter' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,17,40,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: palette.ivory, borderRadius: 20, padding: 22, gap: 12 },
  modalEyebrow: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  modalTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 20, fontWeight: '700' },
  modalMessage: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelButton: { minHeight: 46, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 13, backgroundColor: palette.champagne },
  cancelButtonText: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 46, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 13, backgroundColor: palette.navy },
  confirmButtonText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', backgroundColor: palette.sapphire, borderRadius: 18, padding: 22 },
  emptyTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginTop: 9 },
  emptyDescription: { color: palette.champagne, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
});
