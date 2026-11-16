import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  createPermission,
  listenPermissionsByPraktikan,
  PermissionRecord,
} from '../services/permissionService';
import { Session } from '../types';

const palette = {
  navy: '#112250',
  sapphire: '#3B507D',
  taupe: '#BEB7A7',
  champagne: '#E7E2CE',
  ivory: '#F5F4F0',
};

const statusColor = {
  MENUNGGU: { background: '#E7E2CE', text: '#112250', label: 'Menunggu' },
  DITERIMA: { background: '#DDE9E0', text: '#355C49', label: 'Diterima' },
  DITOLAK: { background: '#F0E7E5', text: '#713D46', label: 'Ditolak' },
} as const;

export default function PermissionRequestScreen() {
  const { currentUser, sessions } = useApp();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<PermissionRecord[]>([]);
  const [sessionPickerVisible, setSessionPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const availableSessions = useMemo(() => {
    if (!currentUser) return [];
    return sessions.filter(session => session.enrolledStudents.includes(currentUser.id));
  }, [currentUser, sessions]);

  useEffect(() => {
    if (!currentUser) {
      setHistory([]);
      return;
    }
    return listenPermissionsByPraktikan(currentUser.id, setHistory);
  }, [currentUser?.id]);

  const submitRequest = async () => {
    setFeedback('');
    setError('');
    if (!currentUser) {
      setError('Silakan pilih identitas praktikan terlebih dahulu.');
      return;
    }
    if (!selectedSession) {
      setError('Pilih sesi praktikum terlebih dahulu.');
      return;
    }
    if (!reason.trim()) {
      setError('Alasan ketidakhadiran wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPermission({
        sessionId: selectedSession.id,
        praktikanId: currentUser.id,
        nama: currentUser.nama,
        nim: currentUser.nim,
        alasan: reason,
      });
      setReason('');
      setFeedback('Pengajuan izin berhasil dikirim dan menunggu keputusan asisten.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Pengajuan izin gagal dikirim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSessionName = (sessionId: string) =>
    sessions.find(session => session.id === sessionId)?.praktikum ?? 'Sesi tidak ditemukan';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PERIZINAN PRAKTIKAN</Text>
        <Text style={styles.pageTitle}>Ajukan izin</Text>
        <Text style={styles.pageDescription}>
          Pilih sesi dan jelaskan alasan ketidakhadiran. Pengajuan akan diperiksa langsung oleh asisten.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Sesi praktikum</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSessionPickerVisible(true)}
            style={({ pressed }) => [styles.sessionSelector, pressed && styles.pressed]}>
            <View style={styles.selectorText}>
              <Text style={[styles.selectorTitle, !selectedSession && styles.placeholder]}>
                {selectedSession?.praktikum ?? 'Pilih sesi'}
              </Text>
              {!!selectedSession && (
                <Text style={styles.selectorSubtitle}>
                  Kelas {selectedSession.kelas} · {selectedSession.tanggal}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={palette.sapphire} />
          </Pressable>

          <Text style={styles.fieldLabel}>Alasan ketidakhadiran</Text>
          <TextInput
            accessibilityLabel="Alasan ketidakhadiran"
            value={reason}
            onChangeText={value => {
              setReason(value);
              setError('');
            }}
            placeholder="Tuliskan alasan izin secara singkat"
            placeholderTextColor="#7C879B"
            multiline
            textAlignVertical="top"
            style={styles.reasonInput}
          />
          <Text style={styles.helperText}>Alasan tidak boleh kosong sebelum pengajuan dikirim.</Text>

          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={submitRequest}
            style={({ pressed }) => [styles.submitButton, (pressed || isSubmitting) && styles.pressed]}>
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Mengirim...' : 'Kirim pengajuan'}</Text>
            <Ionicons name="arrow-forward" size={17} color={palette.ivory} />
          </Pressable>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Riwayat pengajuan</Text>
          <Text style={styles.historyCount}>{history.length}</Text>
        </View>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={26} color={palette.taupe} />
            <Text style={styles.emptyTitle}>Belum ada pengajuan</Text>
            <Text style={styles.emptyDescription}>Riwayat izin yang kamu kirim akan tampil di sini.</Text>
          </View>
        ) : (
          history.map(item => {
            const status = statusColor[item.status];
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyTitle}>{getSessionName(item.sessionId)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.historyMeta}>Diajukan {new Date(item.diajukanPada).toLocaleString('id-ID')}</Text>
                <Text style={styles.historyReason}>{item.alasan}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={sessionPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSessionPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.eyebrow}>SESI PRAKTIKUM</Text>
                <Text style={styles.pickerTitle}>Pilih sesi</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup pilihan sesi"
                onPress={() => setSessionPickerVisible(false)}
                style={styles.closeButton}>
                <Ionicons name="close" size={20} color={palette.navy} />
              </Pressable>
            </View>
            {availableSessions.length === 0 ? (
              <Text style={styles.emptyDescription}>Tidak ada sesi praktikum yang terdaftar.</Text>
            ) : (
              availableSessions.map(session => (
                <Pressable
                  key={session.id}
                  onPress={() => {
                    setSelectedSession(session);
                    setSessionPickerVisible(false);
                    setError('');
                  }}
                  style={styles.sessionOption}>
                  <View style={styles.sessionOptionIcon}>
                    <Ionicons name="calendar-outline" size={18} color={palette.ivory} />
                  </View>
                  <View style={styles.selectorText}>
                    <Text style={styles.selectorTitle}>{session.praktikum}</Text>
                    <Text style={styles.selectorSubtitle}>
                      Kelas {session.kelas} · {session.tanggal} · {session.jamMulai}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.sapphire} />
                </Pressable>
              ))
            )}
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
  formCard: { padding: 18, borderRadius: 20, backgroundColor: palette.ivory },
  fieldLabel: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  sessionSelector: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.taupe, borderRadius: 13, paddingHorizontal: 13, marginBottom: 18, backgroundColor: '#FFFFFF' },
  selectorText: { flex: 1 },
  selectorTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  placeholder: { color: '#7C879B', fontWeight: '400' },
  selectorSubtitle: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 11, marginTop: 4 },
  reasonInput: { minHeight: 118, borderWidth: 1, borderColor: palette.taupe, borderRadius: 13, backgroundColor: '#FFFFFF', padding: 13, color: palette.navy, fontFamily: 'Inter', fontSize: 13, lineHeight: 19 },
  helperText: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 7 },
  submitButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: palette.navy, borderRadius: 13, marginTop: 17 },
  submitButtonText: { color: palette.ivory, fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  error: { color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, marginTop: 10 },
  feedback: { color: '#355C49', backgroundColor: '#DDE9E0', borderRadius: 10, padding: 10, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, marginTop: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  sectionTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 17, fontWeight: '700' },
  historyCount: { color: palette.navy, backgroundColor: palette.champagne, minWidth: 26, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 20, textAlign: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: '700' },
  emptyCard: { alignItems: 'center', backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A', borderRadius: 18, padding: 22 },
  emptyTitle: { color: palette.ivory, fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginTop: 9 },
  emptyDescription: { color: palette.champagne, fontFamily: 'Inter', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  historyCard: { padding: 15, backgroundColor: palette.ivory, borderRadius: 16, marginBottom: 10 },
  historyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  historyTitle: { flex: 1, color: palette.navy, fontFamily: 'Inter', fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontFamily: 'Inter', fontSize: 9, fontWeight: '700' },
  historyMeta: { color: palette.sapphire, fontFamily: 'Inter', fontSize: 10, marginTop: 6 },
  historyReason: { color: palette.navy, fontFamily: 'Inter', fontSize: 12, lineHeight: 18, marginTop: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7,17,40,0.7)' },
  pickerCard: { maxHeight: '80%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: palette.ivory },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerTitle: { color: palette.navy, fontFamily: 'Inter', fontSize: 21, fontWeight: '700', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.champagne },
  sessionOption: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E4E0D6' },
  sessionOptionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: palette.sapphire, alignItems: 'center', justifyContent: 'center' },
});
