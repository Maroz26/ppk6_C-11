// src/components/RecapRow.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatJamDetik } from '../utils/formatTime';

type Props = { nama: string; nim: string; waktu?: string; catatan?: string };

export const RecapRow = ({ nama, nim, waktu, catatan }: Props) => {
  const hadir = !!waktu;
  const tone = hadir ? colors.statusSoft.DIBUKA : colors.statusSoft.DITUTUP;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name}>{nama}</Text>
        <Text style={styles.nim}>{nim}</Text>
        {!!catatan && <Text style={styles.note}>Catatan: {catatan}</Text>}
      </View>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Ionicons
          name={hadir ? 'checkmark-circle' : 'close-circle'}
          size={14}
          color={tone.text}
        />
        <Text style={[styles.badgeText, { color: tone.text }]}>
          {hadir ? formatJamDetik(waktu) : 'Belum hadir'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  left: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  nim: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  note: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
