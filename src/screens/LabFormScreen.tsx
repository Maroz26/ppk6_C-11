// src/screens/LabFormScreen.tsx
// Form tambah / ubah laboratorium (redesign, khusus asisten). Mode ubah memakai ?id=<labId>.
// Logika (preset lab Informatika, ambil lokasi GPS, tempel koordinat Google Maps, validasi) sama seperti sprint 3.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
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
import { color, font, radius as r } from '../theme/tokens';
import { isValidCoordinate, parseCoordinateText } from '../utils/geo';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!hint && <Text style={styles.muted}>{hint}</Text>}
      {children}
    </View>
  );
}

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.placeholder}
        selectionColor={color.purpleDeep}
        style={[styles.input, props.multiline && styles.multiline]}
        {...props}
      />
    </View>
  );
}

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
      <DecoratedScreen title="Ubah Lab" tone="asisten">
        <ActivityIndicator color={color.plum} />
      </DecoratedScreen>
    );
  }

  return (
    <DecoratedScreen title={editingId ? 'Ubah Lab' : 'Tambah Lab'} tone="asisten">
      {!editingId && (
        <Section title="Lab Informatika" hint="Pilih salah satu: nama, gedung, koordinat, dan radius terisi otomatis dan masih bisa diubah.">
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
        </Section>
      )}

      <Section title="Identitas Lab" hint="Nama lab harus sama dengan nama ruang yang dipilih di jadwal.">
        <Field label="Nama laboratorium" value={nama} onChangeText={setNama} placeholder="Lab C" />
        {duplicate && <Text style={styles.hintError}>Nama ini sudah dipakai lab lain.</Text>}
        <Field label="Gedung" value={gedung} onChangeText={setGedung} placeholder="Gedung E FSM" />
        <Field label="Deskripsi (opsional)" value={deskripsi} onChangeText={setDeskripsi} placeholder="Lantai 2, sebelah ruang dosen" multiline />
      </Section>

      <Section
        title="Titik Koordinat"
        hint="Berdiri di dalam lab lalu tekan Pakai lokasi saya. Bisa juga salin titik dari Google Maps (tekan lama titik lab) lalu tempel di kolom Latitude; Longitude ikut terisi."
      >
        <Pressable
          accessibilityRole="button"
          onPress={fillFromMyLocation}
          disabled={locating}
          style={({ pressed }) => [styles.primary, styles.locationButton, (pressed || locating) && styles.pressed]}
        >
          {locating ? <ActivityIndicator color={color.onDark} /> : <Feather name="crosshair" size={18} color={color.onDark} />}
          <Text style={styles.primarySmallText}>{locating ? 'Mencari lokasi...' : 'Pakai lokasi saya'}</Text>
        </Pressable>

        {accuracy !== null && (
          <Text style={accuracy > 30 ? styles.hintWarning : styles.hintOk}>
            Akurasi ±{Math.round(accuracy)} m.{accuracy > 30 ? ' Kurang akurat, coba dekat jendela lalu ambil ulang.' : ''}
          </Text>
        )}

        {locationFail && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{locationErrorMessage(locationFail)}</Text>
            {resolveActionLabel(locationFail) && (
              <Pressable accessibilityRole="button" onPress={handleLocationProblem} hitSlop={6}>
                <Text style={styles.errorAction}>{resolveActionLabel(locationFail)}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Latitude"
              value={latitude}
              onChangeText={onChangeLatitude}
              placeholder="-7.048303"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="110.440741"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </View>
        </View>

        {latitude !== '' && longitude !== '' && !coordinateOk && (
          <Text style={styles.hintError}>Koordinat tidak valid. Latitude -90 s.d. 90, longitude -180 s.d. 180.</Text>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={openInGoogleMaps}
          disabled={!coordinateOk}
          style={({ pressed }) => [styles.outline, (!coordinateOk || pressed) && styles.pressed]}
        >
          <Feather name="external-link" size={16} color={color.purpleInk} />
          <Text style={styles.outlineText}>Cek titik di Google Maps</Text>
        </Pressable>
      </Section>

      <Section
        title="Radius Presensi"
        hint={`Praktikan hanya bisa presensi dalam radius ini dari titik lab (${RADIUS_MIN}-${RADIUS_MAX} m). GPS di dalam gedung bisa meleset 20-50 m.`}
      >
        <View style={styles.chips}>
          {RADIUS_PRESETS.map((value) => {
            const active = toNumber(radius) === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setRadius(String(value))}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{value} m</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Radius (meter)" value={radius} onChangeText={setRadius} keyboardType="number-pad" />
      </Section>

      {!!message && <Text style={styles.errorBanner} accessibilityRole="alert">{message}</Text>}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [styles.primary, (pressed || saving) && styles.pressed]}
      >
        <Text style={styles.primaryText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
      </Pressable>
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  pressed: { opacity: 0.75 },
  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: r.card,
    padding: 20,
    gap: 10,
  },
  cardTitle: { fontFamily: font.display, fontSize: 20, color: color.ink },
  muted: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 13, color: color.ink },
  input: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: r.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.ink,
  },
  multiline: { minHeight: 80, borderRadius: 22, paddingTop: 12, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.lavender,
    backgroundColor: color.card,
  },
  chipActive: { backgroundColor: color.plum, borderColor: color.plum },
  chipSaved: { opacity: 0.5 },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },
  chipTextActive: { color: color.onDark },
  hintError: { fontFamily: font.medium, fontSize: 12, color: color.danger },
  hintWarning: { fontFamily: font.medium, fontSize: 12, color: color.warning },
  hintOk: { fontFamily: font.medium, fontSize: 12, color: color.success },
  errorBox: { backgroundColor: color.dangerSoft, borderRadius: r.sm, padding: 12, gap: 6 },
  errorText: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger },
  errorAction: { fontFamily: font.semibold, fontSize: 13, color: color.danger, textDecorationLine: 'underline' },
  errorBanner: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: r.sm, padding: 12 },
  outline: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: r.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
  },
  outlineText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },
  primary: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
    borderRadius: r.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: { minHeight: 48 },
  primaryText: { fontFamily: font.display, fontSize: 20, color: color.onDark },
  primarySmallText: { fontFamily: font.semibold, fontSize: 14, color: color.onDark },
});
