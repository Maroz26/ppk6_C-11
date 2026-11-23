import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { deleteLab, isLabUsable, labErrorMessage } from '../services/labService';
import { palette } from '../theme';
import { Lab } from '../types';

// Halaman asisten untuk mengelola lokasi laboratorium (koordinat & radius presensi).
export default function LabListScreen() {
  const { role, sessions } = useApp();
  const isAsisten = role === 'ASISTEN';
  const { labs, loading, error } = useLabs();

  const [target, setTarget] = useState<Lab | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Jumlah sesi yang memakai lab ini (lewat labId atau nama ruang yang sama).
  function usedBy(lab: Lab) {
    const nama = lab.nama.trim().toLowerCase();
    return sessions.filter(
      (s) => s.labId === lab.id || String(s.ruang ?? '').trim().toLowerCase() === nama,
    ).length;
  }

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
      await deleteLab(target.id);
      setTarget(null);
    } catch (err) {
      setMessage(labErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={palette.ivory} />
      </Pressable>
      <Text style={styles.eyebrow}>LOKASI LABORATORIUM</Text>
      <Text style={styles.pageTitle}>Kelola laboratorium</Text>
      <Text style={styles.pageDescription}>
        Titik koordinat dan radius di sini menjadi acuan validasi presensi dan ditampilkan di peta.
      </Text>
      {isAsisten && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/lab/form')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={palette.navy} />
          <Text style={styles.addButtonText}>Tambah laboratorium</Text>
        </Pressable>
      )}
    </View>
  );

  const empty = loading ? (
    <View style={styles.emptyCard}>
      <ActivityIndicator color={palette.champagne} />
      <Text style={styles.emptyDescription}>Memuat data laboratorium...</Text>
    </View>
  ) : error ? (
    <View style={styles.emptyCard} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={26} color={palette.champagne} />
      <Text style={styles.emptyTitle}>Data laboratorium gagal dimuat</Text>
      <Text style={styles.emptyDescription}>{error}</Text>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <Ionicons name="business-outline" size={26} color={palette.champagne} />
      <Text style={styles.emptyTitle}>Belum ada laboratorium</Text>
      <Text style={styles.emptyDescription}>
        Tekan Tambah laboratorium untuk menyimpan lokasi lab pertama.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={labs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) => {
          const jumlahSesi = usedBy(item);
          return (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>{item.gedung.toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{item.nama}</Text>
              {!!item.deskripsi && <Text style={styles.cardMateri}>{item.deskripsi}</Text>}

              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={palette.sapphire} />
                <Text style={styles.cardMeta}>
                  {isLabUsable(item)
                    ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
                    : 'Koordinat atau radius belum valid'}
                </Text>
              </View>
              {!isLabUsable(item) && (
                <Text style={styles.invalid}>
                  Data lab ini tidak lengkap. Tekan Ubah lalu isi ulang koordinat dan radius.
                </Text>
              )}
              <View style={styles.metaRow}>
                <Ionicons name="radio-button-on-outline" size={14} color={palette.sapphire} />
                <Text style={styles.cardMeta}>Radius presensi {item.radius} m</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={palette.sapphire} />
                <Text style={styles.cardMeta}>Dipakai {jumlahSesi} sesi</Text>
              </View>

              {isAsisten && (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/lab/form?id=${item.id}`)}
                    style={({ pressed }) => [styles.actionButton, styles.editButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="create-outline" size={16} color={palette.navy} />
                    <Text style={styles.editText}>Ubah</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTarget(item)}
                    style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#713D46" />
                    <Text style={styles.deleteText}>Hapus</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Konfirmasi sebelum menghapus laboratorium. */}
      <Modal transparent animationType="fade" visible={!!target} onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus laboratorium?</Text>
            <Text style={styles.modalText}>{target ? `${target.nama} · ${target.gedung}` : ''}</Text>
            {!!target && usedBy(target) > 0 && (
              <Text style={styles.warning}>
                Lab ini masih dipakai {usedBy(target)} sesi. Praktikan di sesi tersebut tidak dapat
                presensi sampai ruangnya diganti ke lab lain.
              </Text>
            )}
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
  pressed: { opacity: 0.75 },
  card: { padding: 16, backgroundColor: palette.ivory, borderRadius: 18, marginBottom: 12 },
  cardEyebrow: { color: palette.sapphire, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  cardTitle: { color: palette.navy, fontSize: 18, fontWeight: '700', marginTop: 6 },
  cardMateri: { color: palette.navy, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cardMeta: { color: palette.sapphire, fontSize: 12, lineHeight: 18 },
  invalid: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 8,
    fontSize: 11, lineHeight: 16, marginTop: 8,
  },
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
    alignItems: 'center', gap: 6, backgroundColor: palette.sapphire, borderWidth: 1, borderColor: '#52658A',
    borderRadius: 18, padding: 22,
  },
  emptyTitle: { color: palette.ivory, fontSize: 14, fontWeight: '700', marginTop: 3 },
  emptyDescription: { color: palette.champagne, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(7,17,40,0.7)' },
  modalCard: { padding: 20, borderRadius: 20, backgroundColor: palette.ivory },
  modalTitle: { color: palette.navy, fontSize: 20, fontWeight: '700' },
  modalText: { color: palette.sapphire, fontSize: 13, lineHeight: 19, marginTop: 6 },
  warning: {
    color: '#6B5320', backgroundColor: '#F4ECD6', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18, marginTop: 10,
  },
  error: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18, marginTop: 10,
  },
});