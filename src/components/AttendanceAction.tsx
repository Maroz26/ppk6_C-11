// src/components/AttendanceAction.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useMyAttendances } from '../hooks/useAttendanceData';
import { submitAttendance } from '../services/attendanceService';
import { colors } from '../theme/colors';
import { Attendance, Session } from '../types';
import { formatJamDetik } from '../utils/formatTime';
import { SuccessModal } from './SuccessModal';

const ERROR_MESSAGES = {
  SESI_BELUM_DIBUKA: 'Sesi belum dibuka oleh asisten.',
  SESI_DITUTUP: 'Sesi sudah ditutup.',
  SUDAH_PRESENSI: 'Kamu sudah presensi pada sesi ini.',
} as const;

export const AttendanceAction = ({ session }: { session: Session }) => {
  const { currentUser } = useApp();
  const { data: mine, loading } = useMyAttendances(currentUser?.id);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord] = useState<Attendance | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const myRecord = mine.find(a => a.sessionId === session.id);

  const handlePress = async () => {
    if (!currentUser || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitAttendance(session, currentUser, catatan.trim());
      if (result.ok) {
        setRecord(result.record);
        setModalVisible(true);
        setCatatan('');
      } else {
        Alert.alert('Presensi gagal', ERROR_MESSAGES[result.reason]);
      }
    } catch {
      Alert.alert('Presensi gagal', 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <View>
      {myRecord && (
        <View style={styles.notice}>
          <Ionicons name="checkmark-circle" size={22} color={colors.statusSoft.DIBUKA.text} />
          <Text style={styles.noticeText}>Kamu sudah presensi pukul {formatJamDetik(myRecord.waktu)}</Text>
        </View>
      )}

      {!myRecord && session.status === 'DIBUKA' && (
        <View style={styles.form}>
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
            style={({ pressed }) => [styles.btn, (pressed || submitting) && styles.btnPressed]}
            onPress={handlePress}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="finger-print-outline" size={20} color={colors.textOnPrimary} />
            )}
            <Text style={styles.btnText}>{submitting ? 'Menyimpan...' : 'Presensi Sekarang'}</Text>
          </Pressable>
        </View>
      )}

      <SuccessModal
        visible={modalVisible}
        record={record}
        sessionLabel={`${session.praktikum} - Kelas ${session.kelas}`}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loader: { marginVertical: 16 },
  form: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.statusSoft.DIBUKA.bg,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.statusSoft.DIBUKA.text,
    flexShrink: 1,
    textAlign: 'center',
  },
});
