// src/screens/LabListScreen.tsx
// Kelola Lab (redesign, khusus asisten): daftar lokasi laboratorium beserta titik dan radius presensi.
// Logika hapus dan hitung pemakaian sama seperti sprint 3.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import { deleteLab, isLabUsable, labErrorMessage } from '../services/labService';
import { color, font, radius, shadow } from '../theme/tokens';
import { Lab } from '../types';

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
    return sessions.filter((s) => s.labId === lab.id || String(s.ruang ?? '').trim().toLowerCase() === nama).length;
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

  const targetUsage = target ? usedBy(target) : 0;

  return (
    <DecoratedScreen
      title="Kelola Lab"
      tone="asisten"
      footer={
        isAsisten ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/lab/form')}
            style={({ pressed }) => [styles.addButton, shadow.float, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>+ Tambah Lab</Text>
          </Pressable>
        ) : undefined
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introText}>
          Titik dan radius di sini menjadi acuan validasi presensi dan ditampilkan di peta.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/peta')} style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}>
          <Feather name="map" size={16} color={color.purpleInk} />
          <Text style={styles.mapLinkText}>Lihat peta</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={color.plum} />
          <Text style={styles.helper}>Memuat data laboratorium...</Text>
        </View>
      ) : error ? (
        <View style={styles.empty} accessibilityRole="alert">
          <Text style={styles.emptyTitle}>Data laboratorium gagal dimuat</Text>
          <Text style={styles.helper}>{error}</Text>
        </View>
      ) : labs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Belum ada laboratorium</Text>
          <Text style={styles.helper}>Tekan Tambah Lab untuk menyimpan lokasi lab pertama.</Text>
        </View>
      ) : (
        labs.map((lab) => {
          const usable = isLabUsable(lab);
          const count = usedBy(lab);
          return (
            <View key={lab.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Feather name="map-pin" size={18} color={color.inkSoft} />
                <Text style={styles.gedung} numberOfLines={1}>{lab.gedung}</Text>
                {isAsisten && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ubah ${lab.nama}`}
                    onPress={() => router.push(`/lab/form?id=${lab.id}`)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Feather name="edit-2" size={20} color={color.ink} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.title}>{lab.nama}</Text>
              {!!lab.deskripsi && <Text style={styles.desc}>{lab.deskripsi}</Text>}

              <View style={styles.pills}>
                <StatusPill label={`Radius ${lab.radius} m`} tone="info" />
                <StatusPill label={`Dipakai ${count} sesi`} tone="neutral" />
                {!usable && <StatusPill label="Titik belum valid" tone="danger" />}
              </View>
              <Text style={styles.coord}>
                {usable ? `${lab.latitude.toFixed(6)}, ${lab.longitude.toFixed(6)}` : 'Tekan pensil lalu isi ulang koordinat dan radius.'}
              </Text>

              {isAsisten && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMessage('');
                    setTarget(lab);
                  }}
                  hitSlop={6}
                  style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={15} color={color.danger} />
                  <Text style={styles.deleteText}>Hapus</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      <ConfirmDialog
        visible={!!target}
        title="Hapus laboratorium?"
        message={
          target
            ? `${target.nama} · ${target.gedung}.${
                targetUsage > 0
                  ? ` Lab ini masih dipakai ${targetUsage} sesi. Praktikan di sesi tersebut tidak dapat presensi sampai ruangnya diganti.`
                  : ''
              }`
            : ''
        }
        confirmLabel="Hapus"
        danger
        busy={busy}
        error={message}
        onConfirm={confirmDelete}
        onCancel={() => !busy && setTarget(null)}
      />
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.card, borderRadius: radius.input, padding: 14 },
  introText: { flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
  },
  mapLinkText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },

  empty: { backgroundColor: color.card, borderRadius: radius.card, padding: 22, gap: 6, alignItems: 'flex-start' },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: color.ink },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },

  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gedung: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.inkSoft },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: color.ink },
  desc: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  coord: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  deleteLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', minHeight: 36, paddingHorizontal: 4 },
  deleteText: { fontFamily: font.semibold, fontSize: 13, color: color.danger },

  addButton: { minHeight: 54, borderRadius: radius.pill, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: font.display, fontSize: 20, color: color.onDark },
});
