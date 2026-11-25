import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { deleteSession, scheduleErrorMessage } from '../services/scheduleService';
import { palette } from '../theme';
import { Session, SessionStatus } from '../types';

const STATUS: Record<SessionStatus, { label: string; background: string; text: string }> = {
  BELUM_DIBUKA: { label: 'Belum dibuka', background: palette.champagne, text: palette.navy },
  DIBUKA: { label: 'Dibuka', background: '#DDE9E0', text: '#355C49' },
  DITUTUP: { label: 'Ditutup', background: '#F0E7E5', text: '#713D46' },
};

export default function ScheduleScreen() {
  // Daftar sesi di AppContext berasal dari onSnapshot Firestore:
  // asisten menerima semua sesi, praktikan hanya sesi yang ia ikuti.
  const { sessions, sessionsError, currentUser, role } = useApp();
  const isAsisten = role === 'ASISTEN';

  const [target, setTarget] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function closeConfirm() {
    if (busy) return;
    setTarget(null);
    setMessage('');
  }

  async function confirmDelete() {
    if (!target) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteSession(target.id);
      setTarget(null);
    } catch (error) {
      setMessage(scheduleErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={palette.ivory} />
      </Pressable>
      <Text style={styles.eyebrow}>{isAsisten ? 'JADWAL ASISTEN' : 'JADWAL PRAKTIKAN'}</Text>
      <Text style={styles.pageTitle}>Jadwal praktikum</Text>
      <Text style={styles.pageDescription}>
        {isAsisten
          ? 'Tambah, ubah, atau hapus sesi praktikum. Perubahan langsung terlihat di perangkat praktikan.'
          : 'Sesi praktikum yang kamu ikuti. Daftar ini diperbarui otomatis.'}
      </Text>
      {isAsisten && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/sesi/form')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={palette.navy} />
          <Text style={styles.addButtonText}>Tambah sesi</Text>
        </Pressable>
      )}
      {isAsisten && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/asisten/lab')}
          style={({ pressed }) => [styles.labButton, pressed && styles.pressed]}
        >
          <Ionicons name="business-outline" size={18} color={palette.ivory} />
          <Text style={styles.labButtonText}>Kelola laboratorium</Text>
        </Pressable>
      )}
    </View>
  );

  const empty = sessionsError ? (
    <View style={styles.emptyCard} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={26} color={palette.champagne} />
      <Text style={styles.emptyTitle}>Jadwal gagal dimuat</Text>
      <Text style={styles.emptyDescription}>{sessionsError}</Text>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <Ionicons name="calendar-outline" size={26} color={palette.champagne} />
      <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
      <Text style={styles.emptyDescription}>
        {isAsisten
          ? 'Tekan Tambah sesi untuk membuat jadwal praktikum pertama.'
          : 'Sesi akan muncul di sini setelah asisten mendaftarkanmu.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) => {
          const status = STATUS[item.status];
          const jumlah = item.enrolledStudents?.length ?? 0;
          const isOwner = item.dibuatOleh === currentUser?.id;
          return (
            <Pressable
              onPress={() => router.push(`/sesi/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardEyebrow}>PRAKTIKUM · KELAS {item.kelas.toUpperCase()}</Text>
                <View style={[styles.badge, { backgroundColor: status.background }]}>
                  <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.praktikum}</Text>
              <Text style={styles.cardMeta}>
                Pertemuan {item.pertemuan} · {item.tanggal} · {item.jamMulai}–{item.jamSelesai}
              </Text>
              <Text style={styles.cardMeta}>{item.ruang}</Text>
              <Text style={styles.cardMateri}>{item.materi}</Text>

              {isAsisten && (
                <>
                  <Text style={styles.cardMeta}>{jumlah} praktikan terdaftar</Text>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/sesi/form?id=${item.id}`)}
                      style={({ pressed }) => [styles.actionButton, styles.editButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="create-outline" size={16} color={palette.navy} />
                      <Text style={styles.editText}>Ubah</Text>
                    </Pressable>
                    {isOwner && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setTarget(item)}
                        style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.pressed]}
                      >
                        <Ionicons name="trash-outline" size={16} color="#713D46" />
                        <Text style={styles.deleteText}>Hapus</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </Pressable>
          );
        }}
      />

      {/* Konfirmasi sebelum menghapus sesi. */}
      <Modal transparent animationType="fade" visible={!!target} onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus sesi?</Text>
            <Text style={styles.modalText}>
              {target ? `${target.praktikum} · Kelas ${target.kelas} · Pertemuan ${target.pertemuan}` : ''}
            </Text>
            <Text style={styles.modalText}>Sesi yang dihapus tidak dapat dikembalikan.</Text>
            {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeConfirm}
                disabled={busy}
                style={({ pressed }) => [styles.actionButton, styles.editButton, pressed && styles.pressed]}
              >
                <Text style={styles.editText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmDelete}
                disabled={busy}
                style={({ pressed }) => [styles.actionButton, styles.confirmButton, (pressed || busy) && styles.pressed]}
              >
                <Text style={styles.confirmText}>{busy ? 'Menghapus...' : 'Hapus'}</Text>
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
  back: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.sapphire, marginBottom: 16,
  },
  eyebrow: { color: palette.taupe, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  pageTitle: { color: palette.ivory, fontSize: 28, fontWeight: '700', marginTop: 5 },
  pageDescription: { color: palette.champagne, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  addButton: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: palette.champagne, borderRadius: 13, marginBottom: 18,
  },
  addButtonText: { color: palette.navy, fontSize: 13, fontWeight: '700' },
  labButton: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 13, borderWidth: 1, borderColor: palette.taupe, marginTop: -8, marginBottom: 18,
  },
  labButtonText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  card: { padding: 16, backgroundColor: palette.ivory, borderRadius: 18, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardEyebrow: { flex: 1, color: palette.sapphire, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { color: palette.navy, fontSize: 18, fontWeight: '700', marginTop: 10 },
  cardMeta: { color: palette.sapphire, fontSize: 12, lineHeight: 18, marginTop: 4 },
  cardMateri: { color: palette.navy, fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: {
    flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 13,
  },
  editButton: { backgroundColor: palette.champagne, borderWidth: 1, borderColor: palette.taupe },
  editText: { color: palette.navy, fontSize: 13, fontWeight: '700' },
  deleteButton: { backgroundColor: '#F0E7E5', borderWidth: 1, borderColor: '#D9C5C6' },
  deleteText: { color: '#713D46', fontSize: 13, fontWeight: '700' },
  confirmButton: { backgroundColor: '#713D46' },
  confirmText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center', backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A',
    borderRadius: 18, padding: 22,
  },
  emptyTitle: { color: palette.ivory, fontSize: 14, fontWeight: '700', marginTop: 9 },
  emptyDescription: { color: palette.champagne, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(7,17,40,0.7)' },
  modalCard: { padding: 20, borderRadius: 20, backgroundColor: palette.ivory },
  modalTitle: { color: palette.navy, fontSize: 20, fontWeight: '700' },
  modalText: { color: palette.sapphire, fontSize: 13, lineHeight: 19, marginTop: 6 },
  error: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18, marginTop: 10,
  },
});