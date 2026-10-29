// src/components/SuccessModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Attendance } from '../types';
import { formatJamDetik, formatTanggal } from '../utils/formatTime';

type Props = {
  visible: boolean;
  record: Attendance | null;
  sessionLabel: string;
  onClose: () => void;
};

export const SuccessModal = ({ visible, record, sessionLabel, onClose }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={56} color={colors.status.DIBUKA} />
        </View>
        <Text style={styles.title}>Presensi Berhasil</Text>
        <Text style={styles.session}>{sessionLabel}</Text>

        {record && (
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Waktu presensi</Text>
            <Text style={styles.timeValue}>{formatJamDetik(record.waktu)}</Text>
            <Text style={styles.timeDate}>{formatTanggal(record.waktu)}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onClose}
        >
          <Text style={styles.btnText}>OK</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  session: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  timeBox: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.statusSoft.DIBUKA.bg,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  timeLabel: { fontSize: 12, color: colors.statusSoft.DIBUKA.text },
  timeValue: { fontSize: 28, fontWeight: '800', color: colors.statusSoft.DIBUKA.text, marginTop: 2 },
  timeDate: { fontSize: 12, color: colors.statusSoft.DIBUKA.text, marginTop: 2 },
  btn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
