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
import { LAB_PRESETS, LabPreset } from '../data/labPresets';
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
import {
    getCurrentLocation,
    locationErrorMessage,
    LocationFailReason,
    resolveActionLabel,
    resolveLocationProblem,
} from '../services/locationService';
import { palette } from '../theme';
import { isValidCoordinate, parseCoordinateText } from '../utils/geo';

const RADIUS_PRESETS = [25, 50, 100, 200];

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

  // Status tombol "Pakai lokasi saya sekarang".
  const [locating, setLocating] = useState(false);
  const [locationFail, setLocationFail] = useState<LocationFailReason | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

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

  // Kalau yang ditempel berupa pasangan "lat, lng" atau link Google Maps panjang,
  // isi kedua kolom sekaligus.
  function onChangeLatitude(text: string) {
    const parsed = text.length > 12 ? parseCoordinateText(text) : null;
    if (parsed) {
      setLatitude(String(parsed.latitude));
      setLongitude(String(parsed.longitude));
      return;
    }
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(text)) {
      setMessage('Link pendek Google Maps tidak berisi angka koordinat. Buka link-nya, lalu salin angka koordinatnya.');
      return;
    }
    setLatitude(text);
  }

  // Lab yang sudah tersimpan tidak ditawarkan lagi saat menambah lab baru.
  const existingNames = labs
    .filter((lab) => lab.id !== editingId)
    .map((lab) => lab.nama.trim().toLowerCase());

  // Memilih lab Informatika dari daftar: semua kolom terisi otomatis.
  function applyPreset(preset: LabPreset) {
    setNama(preset.nama);
    setGedung(preset.gedung);
    setDeskripsi(preset.deskripsi);
    setRadius(String(preset.radius));
    setAccuracy(null);
    setLocationFail(null);
    if (preset.latitude === null || preset.longitude === null) {
      setLatitude('');
      setLongitude('');
      setMessage(
        `Koordinat ${preset.nama} belum diisi di src/data/labPresets.ts. ` +
          'Isi lewat tombol Pakai lokasi saya sekarang atau tempel koordinatnya.',
      );
      return;
    }
    setLatitude(String(preset.latitude));
    setLongitude(String(preset.longitude));
    setMessage('');
  }

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const coordinateOk = isValidCoordinate({ latitude: lat, longitude: lng });

  // Nama lab dipakai untuk mencocokkan "ruang" pada sesi lama, jadi tidak boleh kembar.
  const duplicate = labs.some(
    (lab) => lab.id !== editingId && lab.nama.trim().toLowerCase() === nama.trim().toLowerCase(),
  );

  // Mengisi koordinat dari GPS perangkat. Paling akurat kalau asisten berdiri di dalam lab.
  async function fillFromMyLocation() {
    setLocating(true);
    setLocationFail(null);
    setAccuracy(null);
    const result = await getCurrentLocation();
    setLocating(false);
    if (!result.ok) {
      setLocationFail(result.reason);
      return;
    }
    setLatitude(result.location.latitude.toFixed(6));
    setLongitude(result.location.longitude.toFixed(6));
    setAccuracy(result.location.accuracy);
  }

  async function handleLocationProblem() {
    if (!locationFail) return;
    if (locationFail === 'IZIN_DITOLAK_PERMANEN' || locationFail === 'GPS_MATI') {
      await resolveLocationProblem(locationFail);
    }
    if (locationFail !== 'IZIN_DITOLAK_PERMANEN') {
      await fillFromMyLocation();
    }
  }

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

          {!editingId && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pilih laboratorium Informatika</Text>
              <Text style={styles.muted}>
                Nama, gedung, koordinat, dan radius terisi otomatis. Semuanya masih bisa diubah.
              </Text>
              <View style={styles.chips}>
                {LAB_PRESETS.map((preset) => {
                  const saved = existingNames.includes(preset.nama.trim().toLowerCase());
                  const active = nama.trim().toLowerCase() === preset.nama.trim().toLowerCase();
                  return (
                    <Pressable
                      key={preset.nama}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: saved, selected: active }}
                      disabled={saved}
                      onPress={() => applyPreset(preset)}
                      style={[styles.chip, active && styles.chipActive, saved && styles.chipSaved]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {preset.nama}
                        {saved ? ' · tersimpan' : preset.latitude === null ? ' · tanpa titik' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Nama laboratorium</Text>
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder="Lab C"
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
              Berdiri di dalam lab lalu tekan Pakai lokasi saya sekarang. Bisa juga menyalin titik dari
              Google Maps (tekan lama titik lab) lalu tempel di kolom Latitude; Longitude ikut terisi.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={fillFromMyLocation}
              disabled={locating}
              style={({ pressed }) => [styles.locationButton, (pressed || locating) && styles.pressed]}
            >
              {locating ? (
                <ActivityIndicator color={palette.ivory} />
              ) : (
                <Ionicons name="locate-outline" size={18} color={palette.ivory} />
              )}
              <Text style={styles.locationButtonText}>
                {locating ? 'Mencari lokasi...' : 'Pakai lokasi saya sekarang'}
              </Text>
            </Pressable>

            {accuracy !== null && (
              <Text style={accuracy > 30 ? styles.hintWarning : styles.hintOk}>
                Lokasi didapat dengan akurasi ±{Math.round(accuracy)} m.
                {accuracy > 30 ? ' Kurang akurat, coba dekat jendela lalu ambil ulang.' : ''}
              </Text>
            )}

            {locationFail && (
              <View style={styles.locationError} accessibilityRole="alert">
                <Text style={styles.locationErrorText}>{locationErrorMessage(locationFail)}</Text>
                {resolveActionLabel(locationFail) && (
                  <Pressable accessibilityRole="button" onPress={handleLocationProblem} hitSlop={6}>
                    <Text style={styles.locationErrorAction}>{resolveActionLabel(locationFail)}</Text>
                  </Pressable>
                )}
              </View>
            )}

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
  chipSaved: { opacity: 0.45 },
  chipText: { color: palette.navy, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: palette.ivory },
  locationButton: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 13, backgroundColor: palette.navy, marginTop: 4,
  },
  locationButtonText: { color: palette.ivory, fontSize: 13, fontWeight: '700' },
  hintOk: { color: '#355C49', fontSize: 11, lineHeight: 16 },
  hintWarning: { color: '#6B5320', fontSize: 11, lineHeight: 16 },
  locationError: { backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10, gap: 6 },
  locationErrorText: { color: '#713D46', fontSize: 12, lineHeight: 18 },
  locationErrorAction: { color: '#713D46', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
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