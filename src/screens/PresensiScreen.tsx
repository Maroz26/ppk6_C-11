// src/screens/PresensiScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { SuccessModal } from '../components/SuccessModal';
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
import { colors } from '../theme/colors';
import { Attendance } from '../types';
import { distanceMeters, formatDistance, isWithinRadius } from '../utils/geo';
import { formatJamDetik, formatTanggal } from '../utils/formatTime';

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
  const [record, setRecord] = useState<Attendance | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
    const jarak = distanceMeters(result.location, labCoord);
    setCheck({
      phase: 'ok',
      coords: result.location,
      jarak,
      inRadius: isWithinRadius(result.location, labCoord, lab.radius),
    });
  }, [lab]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const handleResolve = async () => {
    if (check.phase !== 'error') return;
    await resolveLocationProblem(check.reason);
    runCheck();
  };

  if (!session) return <EmptyState title="Sesi tidak ditemukan" />;

  const canSubmit =
    !myRecord && session.status === 'DIBUKA' && !!lab && check.phase === 'ok' && check.inRadius;

  const handleSubmit = async () => {
    if (!currentUser || submitting || check.phase !== 'ok') return;
    setSubmitting(true);
    try {
      const result = await submitAttendance(session, currentUser, catatan.trim(), lab ?? null, check.coords);
      if (result.ok) {
        setRecord(result.record);
        setModalVisible(true);
        setCatatan('');
      } else {
        Alert.alert('Presensi gagal', ATTENDANCE_ERROR_MESSAGES[result.reason]);
      }
    } catch {
      Alert.alert('Presensi gagal', 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{session.praktikum} - Kelas {session.kelas}</Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={styles.subtitle}>{session.ruang} · {formatTanggal(session.tanggal)} · {session.jamMulai}-{session.jamSelesai}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Pemeriksaan Lokasi</Text>

        {check.phase === 'checking' && (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>Mengambil lokasi perangkat...</Text>
          </View>
        )}

        {check.phase === 'error' && (
          <View style={styles.statusRow}>
            <Ionicons name="warning-outline" size={20} color={colors.statusSoft.DITUTUP.text} />
            <Text style={[styles.statusText, { color: colors.statusSoft.DITUTUP.text }]}>
              {locationErrorMessage(check.reason)}
            </Text>
          </View>
        )}

        {check.phase === 'ok' && !lab && (
          <View style={styles.statusRow}>
            <Ionicons name="warning-outline" size={20} color={colors.statusSoft.DITUTUP.text} />
            <Text style={[styles.statusText, { color: colors.statusSoft.DITUTUP.text }]}>
              Lokasi laboratorium belum diatur asisten.
            </Text>
          </View>
        )}

        {check.phase === 'ok' && lab && (
          <View style={styles.statusRow}>
            <Ionicons
              name={check.inRadius ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={check.inRadius ? colors.statusSoft.DIBUKA.text : colors.statusSoft.DITUTUP.text}
            />
            <Text style={[styles.statusText, { color: check.inRadius ? colors.statusSoft.DIBUKA.text : colors.statusSoft.DITUTUP.text }]}>
              {check.inRadius
                ? `Dalam radius lab (${formatDistance(check.jarak)} dari ${lab.nama})`
                : `Di luar radius lab (${formatDistance(check.jarak)} dari ${lab.nama}, maks ${lab.radius} m)`}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          {check.phase === 'error' && resolveActionLabel(check.reason) && (
            <Pressable style={styles.linkBtn} onPress={handleResolve}>
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>{resolveActionLabel(check.reason)}</Text>
            </Pressable>
          )}
          {check.phase !== 'checking' && (
            <Pressable style={styles.linkBtn} onPress={runCheck}>
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>Periksa ulang lokasi</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.card}>
        {loadingMine ? (
          <ActivityIndicator color={colors.primary} />
        ) : myRecord ? (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={22} color={colors.statusSoft.DIBUKA.text} />
            <Text style={styles.noticeText}>Kamu sudah presensi pukul {formatJamDetik(myRecord.waktu)}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Catatan (opsional)</Text>
            <TextInput
              style={styles.input}
              value={catatan}
              onChangeText={setCatatan}
              placeholder="Contoh: laptop dipinjam"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
            <Pressable
              style={({ pressed }) => [styles.btn, (pressed || submitting || !canSubmit) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="finger-print-outline" size={20} color={colors.textOnPrimary} />
              )}
              <Text style={styles.btnText}>{submitting ? 'Menyimpan...' : 'Presensi Sekarang'}</Text>
            </Pressable>
            {!canSubmit && session.status !== 'DIBUKA' && (
              <Text style={styles.hint}>Presensi hanya bisa dilakukan saat sesi berstatus "Dibuka".</Text>
            )}
          </>
        )}
      </View>

      <SuccessModal
        visible={modalVisible}
        record={record}
        sessionLabel={`${session.praktikum} - Kelas ${session.kelas}`}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14 },
  btnDisabled: { backgroundColor: colors.primaryDark, opacity: 0.6 },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 4 },
  noticeText: { fontSize: 15, fontWeight: '600', color: colors.statusSoft.DIBUKA.text, flexShrink: 1, textAlign: 'center' },
});
