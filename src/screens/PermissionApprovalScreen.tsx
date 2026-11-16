import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  decidePermission,
  listenPermissionsForAssistant,
  PermissionRecord,
} from '../services/permissionService';

const palette = {
  navy: '#112250',
  sapphire: '#3B507D',
  taupe: '#BEB7A7',
  champagne: '#E7E2CE',
  ivory: '#F5F4F0',
};

type PendingDecision = {
  permission: PermissionRecord;
  status: 'DITERIMA' | 'DITOLAK';
};

export default function PermissionApprovalScreen() {
  const { currentUser, sessions } = useApp();
  const [requests, setRequests] = useState<PermissionRecord[]>([]);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setRequests([]);
      return;
    }
    return listenPermissionsForAssistant(currentUser.id, sessions, setRequests);
  }, [currentUser?.id, sessions]);

  const decide = async () => {
    if (!currentUser || !pendingDecision) {
      setError('Identitas asisten tidak tersedia.');
      return;
    }
    setError('');
    setFeedback('');
    try {
      await decidePermission(pendingDecision.permission.id, pendingDecision.status, currentUser.id);
      setFeedback(
        pendingDecision.status === 'DITERIMA'
          ? 'Pengajuan izin telah diterima.'
          : 'Pengajuan izin telah ditolak.'
      );
      setPendingDecision(null);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Keputusan izin gagal disimpan.');
      setPendingDecision(null);
    }
  };

  const getSession = (sessionId: string) => sessions.find(session => session.id === sessionId);

  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.diajukanPada).getTime() - new Date(a.diajukanPada).getTime()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PERIZINAN ASISTEN</Text>
        <Text style={styles.pageTitle}>Pengajuan izin</Text>
        <Text style={styles.pageDescription}>
          Periksa alasan dan sesi praktikum, lalu tetapkan keputusan secara manual.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="mail-unread-outline" size={20} color={palette.navy} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryNumber}>{sortedRequests.filter(item => item.status === 'MENUNGGU').length}</Text>
            <Text style={styles.summaryLabel}>Menunggu keputusan</Text>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryTotal}>{sortedRequests.length} pengajuan</Text>
        </View>

        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>}

        {sortedRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-outline" size={30} color={palette.taupe} />
            <Text style={styles.emptyTitle}>Belum ada pengajuan izin</Text>
            <Text style={styles.emptyDescription}>Pengajuan dari praktikan akan muncul di halaman ini.</Text>
          </View>
        ) : (
          sortedRequests.map(request => {
            const session = getSession(request.sessionId);
            const isPending = request.status === 'MENUNGGU';
            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{request.nama.trim().charAt(0).toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{request.nama}</Text>
                    <Text style={styles.studentNumber}>NIM {request.nim}</Text>
                  </View>
                  <View style={[styles.statusBadge, isPending ? styles.waitingBadge : request.status === 'DITERIMA' ? styles.acceptedBadge : styles.rejectedBadge]}>
                    <Text style={[styles.statusText, isPending ? styles.waitingText : styles.decidedText]}>
                      {request.status === 'MENUNGGU' ? 'Menunggu' : request.status === 'DITERIMA' ? 'Diterima' : 'Ditolak'}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionInfo}>
                  <Ionicons name="calendar-outline" size={15} color={palette.sapphire} />
                  <View style={styles.sessionText}>
                    <Text style={styles.sessionName}>{session?.praktikum ?? 'Sesi tidak ditemukan'}</Text>
                    {session && (
                      <Text style={styles.sessionMeta}>
                        Kelas {session.kelas} · {session.tanggal} · {session.jamMulai}–{session.jamSelesai}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={styles.reasonLabel}>ALASAN IZIN</Text>
                <Text style={styles.reasonText}>{request.alasan}</Text>
                <Text style={styles.requestDate}>Diajukan {new Date(request.diajukanPada).toLocaleString('id-ID')}</Text>

                {isPending ? (
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPendingDecision({ permission: request, status: 'DITOLAK' })}
                      style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
                      <Text style={styles.rejectButtonText}>Tolak</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPendingDecision({ permission: request, status: 'DITERIMA' })}
                      style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}>
                      <Text style={styles.acceptButtonText}>Terima</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.decisionInfo}>
                    <Ionicons
                      name={request.status === 'DITERIMA' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={15}
                      color={request.status === 'DITERIMA' ? '#426F5A' : '#793D4D'}
                    />
                    <Text style={styles.decisionText}>
                      Diputuskan {request.diputuskanPada ? new Date(request.diputuskanPada).toLocaleString('id-ID') : ''}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={pendingDecision !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDecision(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.eyebrow}>KEPUTUSAN IZIN</Text>
            <Text style={styles.modalTitle}>
              {pendingDecision?.status === 'DITERIMA' ? 'Terima pengajuan izin?' : 'Tolak pengajuan izin?'}
            </Text>
            <Text style={styles.modalMessage}>
              Keputusan ini akan langsung terlihat pada riwayat izin praktikan.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setPendingDecision(null)}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
              <Pressable
                style={pendingDecision?.status === 'DITOLAK' ? styles.rejectConfirmButton : styles.acceptButton}
                onPress={decide}>
                <Text style={styles.acceptButtonText}>
                  {pendingDecision?.status === 'DITERIMA' ? 'Terima' : 'Tolak'}
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
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  eyebrow: { color: palette.taupe, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  pageTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 28, fontWeight: '700', marginTop: 5 },
  pageDescription: { color: palette.champagne, fontFamily: 'Inter', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.champagne, borderRadius: 16, padding: 14, marginBottom: 17 },
  summaryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ivory, marginRight: 11 },
  summaryText: { flex: 1 },
  summaryNumber: { color: palette.navy, fontFamily: 'Inter', fontSize: 18, fontWeight: '700' },
  summaryLabel: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: palette.taupe, marginHorizontal: 12 },
  summaryTotal: { color: palette.navy, fontFamily: 'Inter', fontSize: 10, fontWeight: '600' },
  requestCard: { padding: 16, borderRadius: 18, backgroundColor: palette.ivory, marginBottom: 12 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.sapphire, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 17, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { color: palette.navy, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  studentNumber: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 3 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  waitingBadge: { backgroundColor: palette.champagne },
  acceptedBadge: { backgroundColor: '#DDE9E0' },
  rejectedBadge: { backgroundColor: '#F0E7E5' },
  statusText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '700' },
  waitingText: { color: palette.navy },
  decidedText: { color: palette.sapphire },
  sessionInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E9EAF0', borderRadius: 12, padding: 11, marginTop: 14 },
  sessionText: { flex: 1 },
  sessionName: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  sessionMeta: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 4 },
  reasonLabel: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 15 },
  reasonText: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 5 },
  requestDate: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 9, marginTop: 11 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  acceptButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.navy, paddingHorizontal: 14 },
  acceptButtonText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  rejectButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F0E7E5', borderWidth: 1, borderColor: '#D7C2C0' },
  rejectButtonText: { color: '#713D46', fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
  rejectConfirmButton: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#793D4D' },
  decisionInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E4E0D6' },
  decisionText: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10 },
  pressed: { opacity: 0.75 },
  emptyCard: { alignItems: 'center', backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A', borderRadius: 18, padding: 24 },
  emptyTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginTop: 10 },
  emptyDescription: { color: palette.champagne, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  error: { color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, marginBottom: 10 },
  feedback: { color: '#355C49', backgroundColor: '#DDE9E0', borderRadius: 10, padding: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, marginBottom: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7,17,40,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: palette.ivory, borderRadius: 20, padding: 22, gap: 12 },
  modalTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 20, fontWeight: '700' },
  modalMessage: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelButton: { minHeight: 42, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: palette.champagne },
  cancelButtonText: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700' },
});
