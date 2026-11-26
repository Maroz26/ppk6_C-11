// src/screens/PresensiScreen.tsx
// Presensi praktikan (redesign). Alurnya sama seperti sprint 3:
// ambil lokasi perangkat -> hitung jarak ke lab -> tombol presensi aktif hanya di dalam radius
// saat sesi berstatus Dibuka. Yang berubah tampilannya.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { OrangePanel } from '../components/ui/OrangePanel';
import { useApp } from '../context/AppContext';
import { useMyAttendances } from '../hooks/useAttendanceData';
import { useLabs } from '../hooks/useLabs';
import { submitAttendance } from '../services/attendanceService';
import { findLabForSession } from '../services/labService';
import {
  DeviceLocation,
  getCurrentLocation,
  LocationFailReason,
  locationErrorMessage,
  resolveActionLabel,
  resolveLocationProblem,
} from '../services/locationService';
import { images } from '../theme/assets';
import { color, font, radius, sessionStatusColor } from '../theme/tokens';
import { Attendance } from '../types';
import { formatJamDetik, formatTanggal } from '../utils/formatTime';
import { distanceMeters, formatDistance, isWithinRadius } from '../utils/geo';

const ATTENDANCE_ERROR_MESSAGES = {
  SESI_BELUM_DIBUKA: 'Sesi belum dibuka oleh asisten.',
  SESI_DITUTUP: 'Sesi sudah ditutup.',
  SUDAH_PRESENSI: 'Kamu sudah presensi pada sesi ini.',
  LUAR_RADIUS: 'Kamu berada di luar radius laboratorium.',
  LOKASI_TIDAK_VALID: 'Lokasi laboratorium belum diatur asisten. Hubungi asisten.',
} as const;

type CheckState =
  | { phase: 'checking' }
  | { phase: 'ok'; coords: DeviceLocation; jarak: number; inRadius: boolean }
  | { phase: 'error'; reason: LocationFailReason };

export default function PresensiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, currentUser } = useApp();
  const { labs } = useLabs();
  const { data: mine, loading: loadingMine } = useMyAttendances(currentUser?.id);

  const session = sessions.find((s) => s.id === id);
  const lab = session ? findLabForSession(session, labs) : undefined;
  const myRecord = mine.find((a) => a.sessionId === id);

  const [check, setCheck] = useState<CheckState>({ phase: 'checking' });
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [record, setRecord] = useState<Attendance | null>(null);

  const runCheck = useCallback(async () => {
    setCheck({ phase: 'checking' });
    const result = await getCurrentLocation();
    if (!result.ok) {
      setCheck({ phase: 'error', reason: result.reason });
      return;
    }
    if (!lab) {
      setCheck({ phase: 'ok', coords: result.location, jarak: NaN, inRadius: false });
      return;
    }
    const labCoord = { latitude: lab.latitude, longitude: lab.longitude };
    setCheck({
      phase: 'ok',
      coords: result.location,
      jarak: distanceMeters(result.location, labCoord),
      inRadius: isWithinRadius(result.location, labCoord, lab.radius),
    });
  }, [lab]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  async function handleResolve() {
    if (check.phase !== 'error') return;
    await resolveLocationProblem(check.reason);
    runCheck();
  }

  if (!session) {
    return (
      <DecoratedScreen title="Presensi" tone="praktikan">
        <View style={styles.card}>
          <Text style={styles.title}>Sesi tidak ditemukan</Text>
          <Text style={styles.body}>Sesi ini mungkin sudah dihapus, atau kamu tidak terdaftar di dalamnya.</Text>
        </View>
      </DecoratedScreen>
    );
  }

  const canSubmit = !myRecord && session.status === 'DIBUKA' && !!lab && check.phase === 'ok' && check.inRadius;

  async function handleSubmit() {
    if (!session || !currentUser || submitting || check.phase !== 'ok') return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitAttendance(session, currentUser, catatan.trim(), lab ?? null, check.coords);
      if (result.ok) {
        setRecord(result.record);
        setCatatan('');
      } else {
        setSubmitError(ATTENDANCE_ERROR_MESSAGES[result.reason]);
      }
    } catch {
      setSubmitError('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  const badge = sessionStatusColor[session.status];

  // Tampilan lingkaran status lokasi.
  const loc = (() => {
    if (check.phase === 'checking') return { icon: null, tint: color.purpleDeep, bg: color.lavenderSoft, big: '...', text: 'Mengambil lokasi perangkat...' };
    if (check.phase === 'error') return { icon: 'alert-triangle' as const, tint: color.danger, bg: color.dangerSoft, big: '!', text: locationErrorMessage(check.reason) };
    if (!lab) return { icon: 'alert-triangle' as const, tint: color.danger, bg: color.dangerSoft, big: '!', text: 'Lokasi laboratorium belum diatur asisten.' };
    return check.inRadius
      ? { icon: 'check' as const, tint: color.success, bg: color.successSoft, big: formatDistance(check.jarak), text: `Kamu di dalam area ${lab.nama}.` }
      : { icon: 'x' as const, tint: color.danger, bg: color.dangerSoft, big: formatDistance(check.jarak), text: `Kamu di luar area ${lab.nama}. Mendekatlah sampai jarak maksimal ${lab.radius} m.` };
  })();

  return (
    <DecoratedScreen title="Presensi" tone="praktikan">
      <View style={styles.card}>
        <View style={styles.row}>
          <Feather name="map-pin" size={18} color={color.inkSoft} />
          <Text style={styles.location} numberOfLines={1}>{lab ? `${lab.nama}, ${lab.gedung}` : session.ruang}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.title}>{session.praktikum}</Text>
        <Text style={styles.body}>
          {formatTanggal(session.tanggal)} · {session.jamMulai} - {session.jamSelesai} · Kelas {session.kelas}
        </Text>
      </View>

      <OrangePanel title="Lokasi Kamu">
        <View style={styles.locRow}>
          <View style={[styles.circle, { backgroundColor: loc.bg }]}>
            {check.phase === 'checking' ? (
              <ActivityIndicator color={loc.tint} />
            ) : (
              <Feather name={loc.icon ?? 'alert-triangle'} size={28} color={loc.tint} />
            )}
          </View>
          <View style={styles.flex}>
            {check.phase === 'ok' && lab && <Text style={[styles.distance, { color: loc.tint }]}>{loc.big}</Text>}
            <Text style={styles.body} accessibilityLiveRegion="polite">{loc.text}</Text>
          </View>
        </View>

        <View style={styles.smallActions}>
          {check.phase === 'error' && resolveActionLabel(check.reason) && (
            <Pressable accessibilityRole="button" onPress={handleResolve} style={({ pressed }) => [styles.outline, pressed && styles.pressed]}>
              <Feather name="settings" size={16} color={color.purpleInk} />
              <Text style={styles.outlineText}>{resolveActionLabel(check.reason)}</Text>
            </Pressable>
          )}
          {check.phase !== 'checking' && (
            <Pressable accessibilityRole="button" onPress={runCheck} style={({ pressed }) => [styles.outline, pressed && styles.pressed]}>
              <Feather name="refresh-cw" size={16} color={color.purpleInk} />
              <Text style={styles.outlineText}>Periksa ulang</Text>
            </Pressable>
          )}
        </View>
      </OrangePanel>

      <View style={styles.card}>
        {loadingMine ? (
          <ActivityIndicator color={color.plum} />
        ) : myRecord ? (
          <View style={styles.row}>
            <View style={[styles.circleSmall, { backgroundColor: color.successSoft }]}>
              <Feather name="check" size={20} color={color.success} />
            </View>
            <Text style={[styles.body, styles.flex]}>Kamu sudah presensi pukul {formatJamDetik(myRecord.waktu)}.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              accessibilityLabel="Catatan presensi"
              style={styles.input}
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Contoh: laptop dipinjam"
              placeholderTextColor={color.placeholder}
              selectionColor={color.purpleDeep}
              maxLength={100}
            />
            {!!submitError && <Text style={styles.error} accessibilityRole="alert">{submitError}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting || !canSubmit }}
              onPress={handleSubmit}
              disabled={submitting || !canSubmit}
              style={({ pressed }) => [styles.primary, (!canSubmit || submitting) && styles.primaryDisabled, pressed && styles.pressed]}
            >
              {submitting && <ActivityIndicator color={color.onDark} />}
              <Text style={styles.primaryText}>{submitting ? 'Menyimpan...' : 'Presensi Sekarang'}</Text>
            </Pressable>
            {session.status !== 'DIBUKA' && (
              <Text style={styles.hint}>Presensi hanya bisa dilakukan saat sesi berstatus Dibuka.</Text>
            )}
          </>
        )}
      </View>

      {/* Dialog berhasil */}
      <Modal transparent animationType="fade" visible={!!record} onRequestClose={() => setRecord(null)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Image source={images.mascotHead} style={styles.mascot} resizeMode="contain" />
            <Text style={styles.dialogTitle}>Presensi Berhasil!</Text>
            <Text style={styles.body}>{session.praktikum} · Kelas {session.kelas}</Text>
            {record && (
              <View style={styles.timeBox}>
                <Text style={styles.timeValue}>{formatJamDetik(record.waktu)}</Text>
                <Text style={styles.hint}>
                  {formatTanggal(record.waktu)}
                  {record.jarakMeter != null ? ` · ${Math.round(record.jarakMeter)} m dari lab` : ''}
                </Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRecord(null);
                router.back();
              }}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Selesai</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 20,
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  location: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.inkSoft },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  title: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: color.ink },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },
  label: { fontFamily: font.medium, fontSize: 14, color: color.ink },
  hint: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: color.muted, textAlign: 'center' },

  locRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  circle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  circleSmall: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  distance: { fontFamily: font.display, fontSize: 28, lineHeight: 32 },
  smallActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  outline: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    backgroundColor: color.card,
  },
  outlineText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },

  input: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.ink,
  },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 12 },
  primary: {
    minHeight: 54,
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryDisabled: { backgroundColor: color.muted },
  primaryText: { fontFamily: font.display, fontSize: 20, color: color.onDark },

  backdrop: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: 'rgba(54,54,54,0.55)' },
  dialog: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: color.lavender,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  mascot: { width: 84, height: 88 },
  dialogTitle: { fontFamily: font.display, fontSize: 26, color: color.ink },
  timeBox: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: color.successSoft, borderRadius: radius.input, paddingVertical: 12, marginVertical: 6 },
  timeValue: { fontFamily: font.display, fontSize: 30, color: color.success },
});
