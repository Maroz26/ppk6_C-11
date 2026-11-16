import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { listenSessionById, setSessionStatus } from '../services/sessionControlService';
import { Session } from '../types';
import { formatJam } from '../utils/formatTime';

const palette = {
  navy: '#112250',
  sapphire: '#3B507D',
  taupe: '#BEB7A7',
  champagne: '#E7E2CE',
  ivory: '#F5F4F0',
  success: '#B7D9C5',
  danger: '#E4A5A9',
};

export default function SessionManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, praktikanList, currentUser, openSession, closeSession, getAttendanceBySession } = useApp();
  const [liveSession, setLiveSession] = useState<Session | null>(null);
  const [pendingAction, setPendingAction] = useState<'open' | 'close' | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!id) return;
    return listenSessionById(id, setLiveSession);
  }, [id]);

  const session = liveSession ?? sessions.find(item => item.id === id) ?? null;

  if (!session) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <Text style={styles.bodyText}>Sesi tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  const isOpen = session.status === 'DIBUKA';
  const isClosed = session.status === 'DITUTUP';
  const isNotStarted = session.status === 'BELUM_DIBUKA';
  const roster = praktikanList.filter(student => session.enrolledStudents.includes(student.id));
  const hadir = getAttendanceBySession(session.id).length;
  const activeStep = isClosed ? 2 : isOpen ? 1 : 0;

  const handleConfirm = async () => {
    if (!currentUser || !pendingAction) {
      setActionError('Identitas asisten tidak tersedia.');
      return;
    }

    const nextStatus = pendingAction === 'open' ? 'DIBUKA' : 'DITUTUP';
    try {
      await setSessionStatus(session.id, nextStatus, currentUser.id);
      if (nextStatus === 'DIBUKA') openSession(session.id);
      else closeSession(session.id);
      setActionFeedback(nextStatus === 'DIBUKA'
        ? 'Sesi berhasil dibuka. Praktikan dapat melakukan presensi.'
        : 'Sesi berhasil ditutup. Presensi telah dikunci.');
      setActionError('');
      setPendingAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Status sesi gagal diperbarui.');
      setPendingAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <Text style={styles.eyebrow}>KONTROL SESI</Text>
          <Text style={styles.pageTitle}>Detail sesi</Text>

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>{session.praktikum} · Kelas {session.kelas}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {isOpen ? 'DIBUKA' : isClosed ? 'DITUTUP' : 'BELUM DIBUKA'}
                </Text>
              </View>
            </View>
            <Text style={styles.sessionName}>{session.praktikum}</Text>
            <Text style={styles.heroCaption}>Atur status sesi dan pantau kehadiran praktikan.</Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroBottom}>
              <View style={styles.heroInfo}>
                <Text style={styles.infoLabel}>JADWAL</Text>
                <Text style={styles.infoValue}>{session.tanggal}</Text>
                <Text style={styles.infoValue}>{session.jamMulai}–{session.jamSelesai}</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.infoLabel}>RUANG</Text>
                <Text style={styles.infoValue}>{session.ruang}</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.infoLabel}>PERTEMUAN</Text>
                <Text style={styles.infoValue}>{session.pertemuan}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Status sesi</Text>
            <Text style={styles.statusSubtitle}>
              {isOpen ? 'Presensi sedang tersedia' : isClosed ? 'Sesi telah selesai' : 'Menunggu sesi dibuka'}
            </Text>

            <View style={styles.lifecycle}>
              <View style={styles.lifecycleHeading}>
                <Text style={styles.infoLabel}>ALUR SESI</Text>
                <Text style={styles.lifecycleIndex}>0{activeStep + 1} / 03</Text>
              </View>
              <View style={styles.flowTrack}>
                {['Terjadwal', 'Dibuka', 'Ditutup'].map((step, index) => {
                  const isComplete = index <= activeStep;
                  return (
                    <View key={step} style={styles.flowStep}>
                      <View style={styles.flowNodeRow}>
                        <View style={[styles.flowNode, isComplete && styles.flowNodeActive]} />
                        {index < 2 && (
                          <View style={[styles.flowConnector, index < activeStep && styles.flowConnectorActive]} />
                        )}
                      </View>
                      <Text style={[styles.flowLabel, isComplete && styles.flowLabelActive]}>{step}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.hint}>
              {isNotStarted
                ? 'Sesi belum dibuka. Praktikan belum bisa melakukan presensi.'
                : isOpen
                  ? `Sesi dibuka pukul ${session.dibukaPada ? formatJam(session.dibukaPada) : '-'}. Hadir: ${hadir} dari ${roster.length} praktikan.`
                  : `Sesi ditutup pukul ${session.ditutupPada ? formatJam(session.ditutupPada) : '-'}. Total hadir: ${hadir} dari ${roster.length} praktikan.`}
            </Text>

            {isNotStarted && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActionError('');
                  setPendingAction('open');
                }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Buka sesi</Text>
              </Pressable>
            )}
            {isOpen && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setActionError('');
                  setPendingAction('close');
                }}
                style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Tutup sesi</Text>
              </Pressable>
            )}
            {isClosed && (
              <View style={styles.closedNotice}>
                <Text style={styles.closedNoticeText}>Sesi sudah ditutup dan tidak dapat dibuka kembali.</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/rekap/${session.id}`)}
              style={({ pressed }) => [styles.recapButton, pressed && styles.pressed]}>
              <Text style={styles.recapButtonText}>Lihat rekap kehadiran</Text>
              <Text style={styles.recapArrow}>→</Text>
            </Pressable>
            {!!actionFeedback && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{actionFeedback}</Text>}
            {!!actionError && <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError}</Text>}
          </View>

          <Text style={styles.footerText}>ASSIST · KONTROL SESI</Text>
        </View>
      </ScrollView>

      <Modal
        visible={pendingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.eyebrow}>KONFIRMASI TINDAKAN</Text>
            <Text style={styles.modalTitle}>
              {pendingAction === 'open' ? 'Buka sesi sekarang?' : 'Tutup sesi ini?'}
            </Text>
            <Text style={styles.modalMessage}>
              {pendingAction === 'open'
                ? 'Praktikan dapat melakukan presensi setelah sesi dibuka.'
                : 'Setelah ditutup, praktikan tidak dapat melakukan presensi lagi. Sesi tidak dapat dibuka kembali.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPendingAction(null)}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                style={pendingAction === 'close' ? styles.dangerButton : styles.primaryButton}
                onPress={handleConfirm}>
                <Text style={styles.primaryButtonText}>{pendingAction === 'open' ? 'Buka sesi' : 'Tutup sesi'}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  page: { width: '100%', maxWidth: 700, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: palette.navy },
  eyebrow: { color: palette.taupe, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  pageTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 28, fontWeight: '700', marginTop: 6, marginBottom: 18 },
  heroCard: { padding: 20, borderRadius: 20, backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroLabel: { flex: 1, color: palette.ivory, fontFamily: 'Inter', fontSize: 12, fontWeight: '600' },
  statusBadge: { backgroundColor: palette.champagne, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { color: palette.navy, fontFamily: 'Inter', fontSize: 9, fontWeight: '700' },
  sessionName: { color: palette.ivory, fontFamily: 'Inter', fontSize: 22, fontWeight: '700', marginTop: 18 },
  heroCaption: { color: palette.champagne, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 6 },
  heroDivider: { height: 1, backgroundColor: '#7583A0', marginTop: 20, marginBottom: 15 },
  heroBottom: { flexDirection: 'row', gap: 12 },
  heroInfo: { flex: 1 },
  infoLabel: { color: palette.taupe, fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  infoValue: { color: palette.ivory, fontFamily: 'Inter', fontSize: 12, fontWeight: '600', marginTop: 5 },
  statusCard: { padding: 18, marginTop: 14, borderRadius: 20, backgroundColor: palette.ivory },
  sectionTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 17, fontWeight: '700' },
  statusSubtitle: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 12, marginTop: 4 },
  lifecycle: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: '#E7E2CE', borderWidth: 1, borderColor: '#D5CFBD' },
  lifecycleHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  lifecycleIndex: { color: palette.navy, fontFamily: 'Inter', fontSize: 9, fontWeight: '700' },
  flowTrack: { flexDirection: 'row' },
  flowStep: { flex: 1 },
  flowNodeRow: { flexDirection: 'row', alignItems: 'center' },
  flowNode: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: palette.sapphire, backgroundColor: palette.ivory },
  flowNodeActive: { backgroundColor: palette.sapphire, borderColor: palette.sapphire },
  flowConnector: { height: 1, flex: 1, backgroundColor: '#BEB7A7' },
  flowConnectorActive: { backgroundColor: palette.sapphire },
  flowLabel: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 9, fontWeight: '600', marginTop: 7 },
  flowLabelActive: { color: palette.navy },
  hint: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 12, lineHeight: 19, paddingVertical: 16 },
  primaryButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 13, backgroundColor: palette.navy },
  dangerButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 13, backgroundColor: '#793D4D' },
  pressed: { opacity: 0.78 },
  primaryButtonText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  closedNotice: { padding: 13, borderRadius: 12, backgroundColor: '#F0E7E5', borderWidth: 1, borderColor: '#D7C2C0' },
  closedNoticeText: { color: '#713D46', fontFamily: 'Inter', fontSize: 11, lineHeight: 17 },
  recapButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  recapButtonText: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  recapArrow: { color: palette.navy, fontSize: 18, fontWeight: '700' },
  feedback: { color: '#355C49', backgroundColor: '#E6EFE8', padding: 12, borderRadius: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17 },
  error: { color: '#713D46', backgroundColor: '#F0E7E5', padding: 12, borderRadius: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17 },
  footerText: { color: palette.taupe, textAlign: 'center', fontFamily: 'Inter', fontSize: 9, fontWeight: '600', letterSpacing: 1.2, marginTop: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7, 17, 40, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: palette.ivory, borderRadius: 20, padding: 22, gap: 12 },
  modalTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 20, fontWeight: '700' },
  modalMessage: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E7E2CE' },
  cancelButtonText: { color: palette.navy, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  bodyText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 14 },
});
