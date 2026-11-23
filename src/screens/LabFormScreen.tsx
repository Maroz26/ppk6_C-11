import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useLabs } from '../hooks/useLabs';
import {
    createLab,
    getLabById,
    labErrorMessage,
    LabInput,
    RADIUS_DEFAULT,
    RADIUS_MAX,
    RADIUS_MIN,
    updateLab,
    validateLab,
} from '../services/labService';
import { palette } from '../theme';
import { isValidCoordinate } from '../utils/geo';

const RADIUS_PRESETS = [25, 50, 100, 200];

// Koordinat hasil salin dari Google Maps, contoh "-6.973012, 107.630415".
const PASTED_PAIR = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/;

// Menerima desimal bertitik maupun berkoma ("-6,97" -> -6.97).
function toNumber(text: string): number {
  const cleaned = text.trim().replace(',', '.');
  return cleaned === '' ? NaN : Number(cleaned);
}

// Form tambah/ubah laboratorium. Mode ubah memakai parameter ?id=<labId>.
export default function LabFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof id === 'string' && id ? id : null;
  const { currentUser, role } = useApp();
  const { labs } = useLabs();

  const [nama, setNama] = useState('');
  const [gedung, setGedung] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(String(RADIUS_DEFAULT));

  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Mode ubah: isi form dengan data lab yang sudah tersimpan.
  useEffect(() => {
    if (!editingId) return;
    let active = true;
    getLabById(editingId)
      .then((lab) => {
        if (!active) return;
        if (!lab) {
          setMessage('Laboratorium tidak ditemukan. Mungkin sudah dihapus.');
          return;
        }
        setNama(lab.nama);
        setGedung(lab.gedung);
        setDeskripsi(lab.deskripsi);
        setLatitude(String(lab.latitude));
        setLongitude(String(lab.longitude));
        setRadius(String(lab.radius));
      })
      .catch((err) => active && setMessage(labErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [editingId]);

  // Kalau yang ditempel berupa pasangan "lat, lng", isi kedua kolom sekaligus.
  function onChangeLatitude(text: string) {
    const pair = text.match(PASTED_PAIR);
    if (pair) {
      setLatitude(pair[1]);
      setLongitude(pair[2]);
      return;
    }
    setLatitude(text);
  }

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const coordinateOk = isValidCoordinate({ latitude: lat, longitude: lng });

  // Nama lab dipakai untuk mencocokkan "ruang" pada sesi lama, jadi tidak boleh kembar.
  const duplicate = labs.some(
    (lab) => lab.id !== editingId && lab.nama.trim().toLowerCase() === nama.trim().toLowerCase(),
  );

  function openInGoogleMaps() {
    if (!coordinateOk) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() =>
      setMessage('Tidak dapat membuka Google Maps di perangkat ini.'),
    );
  }

  async function save() {
    if (!currentUser || role !== 'ASISTEN') {
      setMessage('Hanya asisten yang dapat menyimpan data laboratorium.');
      return;
    }
    const input: LabInput = {
      nama,
      gedung,
      deskripsi,
      latitude: lat,
      longitude: lng,
      radius: toNumber(radius),
    };
    const invalid = validateLab(input);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    if (duplicate) {
      setMessage('Nama laboratorium sudah dipakai. Gunakan nama lain.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      if (editingId) {
        await updateLab(editingId, input, currentUser.id);
      } else {
        await createLab(input, currentUser.id);
      }
      router.back();
    } catch (err) {
      setMessage(labErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={palette.champagne} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={palette.ivory} />
          </Pressable>
          <Text style={styles.eyebrow}>LOKASI LABORATORIUM</Text>
          <Text style={styles.pageTitle}>{editingId ? 'Ubah laboratorium' : 'Tambah laboratorium'}</Text>
          <Text style={styles.pageDescription}>
            Nama laboratorium harus sama dengan nama ruang yang dipilih di jadwal.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Nama laboratorium</Text>
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder="Lab Komputer 1"
              placeholderTextColor={palette.taupe}
              style={styles.input}
            />
            {duplicate && <Text style={styles.hintError}>Nama ini sudah dipakai lab lain.</Text>}

            <Text style={styles.label}>Gedung</Text>
            <TextInput
              value={gedung}
              onChangeText={setGedung}
              placeholder="Gedung Informatika"
              placeholderTextColor={palette.taupe}
              style={styles.input}
            />

            <Text style={styles.label}>Deskripsi (opsional)</Text>
            <TextInput
              value={deskripsi}
              onChangeText={setDeskripsi}
              placeholder="Lantai 2, sebelah ruang dosen"
              placeholderTextColor={palette.taupe}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Titik koordinat</Text>
            <Text style={styles.muted}>
              Di Google Maps, tekan lama titik lab lalu salin angkanya. Tempel di kolom Latitude, kolom
              Longitude akan terisi otomatis.
            </Text>

            <Text style={styles.label}>Latitude</Text>
            <TextInput
              value={latitude}
              onChangeText={onChangeLatitude}
              placeholder="-6.973012"
              placeholderTextColor={palette.taupe}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Longitude</Text>
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="107.630415"
              placeholderTextColor={palette.taupe}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              style={styles.input}
            />

            {latitude !== '' && longitude !== '' && !coordinateOk && (
              <Text style={styles.hintError}>
                Koordinat tidak valid. Latitude -90 s.d. 90, longitude -180 s.d. 180.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={openInGoogleMaps}
              disabled={!coordinateOk}
              style={({ pressed }) => [styles.secondaryButton, (!coordinateOk || pressed) && styles.pressed]}
            >
              <Ionicons name="map-outline" size={16} color={palette.navy} />
              <Text style={styles.secondaryText}>Cek titik di Google Maps</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Radius presensi</Text>
            <Text style={styles.muted}>
              Praktikan hanya dapat presensi jika berada dalam radius ini dari titik lab
              ({RADIUS_MIN}–{RADIUS_MAX} meter). GPS di dalam gedung bisa meleset 20–50 m.
            </Text>

            <View style={styles.chips}>
              {RADIUS_PRESETS.map((value) => {
                const active = toNumber(radius) === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    onPress={() => setRadius(String(value))}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{value} m</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Radius (meter)</Text>
            <TextInput
              value={radius}
              onChangeText={setRadius}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}

          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]}
          >
            <Text style={styles.primaryText}>
              {saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Simpan laboratorium'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.navy },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40, gap: 14 },
  back: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.sapphire,
  },
  eyebrow: { color: palette.taupe, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  pageTitle: { color: palette.ivory, fontSize: 28, fontWeight: '700', marginTop: -8 },
  pageDescription: { color: palette.champagne, fontSize: 13, lineHeight: 20, marginTop: -6 },
  card: { padding: 16, gap: 8, backgroundColor: palette.ivory, borderRadius: 18 },
  cardTitle: { color: palette.navy, fontSize: 16, fontWeight: '700' },
  muted: { color: palette.sapphire, fontSize: 12, lineHeight: 18 },
  label: { color: palette.navy, fontSize: 12, fontWeight: '700', marginTop: 4 },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: palette.taupe, borderRadius: 13,
    backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 10,
    color: palette.navy, fontSize: 14,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  hintError: { color: '#713D46', fontSize: 11, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: palette.taupe, backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: palette.navy, borderColor: palette.navy },
  chipText: { color: palette.navy, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: palette.ivory },
  secondaryButton: {
    minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 13, backgroundColor: palette.champagne, borderWidth: 1, borderColor: palette.taupe, marginTop: 6,
  },
  secondaryText: { color: palette.navy, fontSize: 13, fontWeight: '700' },
  primaryButton: {
    minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.champagne,
  },
  primaryText: { color: palette.navy, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  error: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18,
  },
});