// src/components/AttendanceAction.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { Attendance, Session } from '../types';
import { SuccessModal } from './SuccessModal';

const ERROR_MESSAGES = {
  SESI_BELUM_DIBUKA: 'Sesi belum dibuka oleh asisten.',
  SESI_DITUTUP: 'Sesi sudah ditutup.',
  SUDAH_PRESENSI: 'Kamu sudah presensi pada sesi ini.',
} as const;

export const AttendanceAction = ({ session }: { session: Session }) => {
  const { currentUser, hasAttended, markAttendance } = useApp();
  const [catatan, setCatatan] = useState('');
  const [record, setRecord] = useState<Attendance | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const attended = currentUser ? hasAttended(session.id, currentUser.id) : false;

  const handlePress = () => {
    const result = markAttendance(session.id, catatan.trim());
    if (result.ok) {
      setRecord(result.record);
      setModalVisible(true);
      setCatatan('');
    } else {
      Alert.alert('Presensi gagal', ERROR_MESSAGES[result.reason]);
    }
  };

  return (
    <View>
      {!attended && (
        <View>
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
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handlePress}
          >
            <Ionicons name="finger-print-outline" size={20} color={colors.textOnPrimary} />
            <Text style={styles.btnText}>Presensi Sekarang</Text>
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
    marginBottom: 12,
  },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
});
