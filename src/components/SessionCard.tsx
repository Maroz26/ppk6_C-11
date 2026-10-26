import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Session } from '../types';
import { formatTanggal } from '../utils/formatTime';
import { StatusBadge } from './StatusBadge';

type Props = { session: Session; onPress?: () => void; footer?: React.ReactNode };

export const SessionCard = ({ session, onPress, footer }: Props) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{session.praktikum} - Kelas {session.kelas}</Text>
        <StatusBadge status={session.status} />
      </View>
      <Text style={styles.desc}>{formatTanggal(session.tanggal)} • {session.jamMulai} - {session.jamSelesai}</Text>
      <Text style={styles.desc}>Ruang: {session.ruang}</Text>
      {footer && <View style={styles.footer}>{footer}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: colors.text, flex: 1 },
  desc: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }
});