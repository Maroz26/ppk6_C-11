// src/components/ReviewCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatJam, formatTanggal } from '../utils/formatTime';
import { SentimentBadge } from './SentimentBadge';

type Props = {
  nama: string;
  nim: string;
  teks: string;
  sentimen: string;
  dibuatPada: string;
  sessionLabel?: string;
  showAuthor?: boolean;
};

export const ReviewCard = ({ nama, nim, teks, sentimen, dibuatPada, sessionLabel, showAuthor }: Props) => (
  <View style={styles.card}>
    <View style={styles.top}>
      <View style={styles.topLeft}>
        {showAuthor && <Text style={styles.name}>{nama} • {nim}</Text>}
        {!!sessionLabel && <Text style={styles.session}>{sessionLabel}</Text>}
      </View>
      <SentimentBadge label={sentimen} />
    </View>
    <Text style={styles.body}>{teks}</Text>
    <Text style={styles.time}>{formatTanggal(dibuatPada)} • {formatJam(dibuatPada)}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  topLeft: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  session: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  body: { fontSize: 14, color: colors.text, marginTop: 10, lineHeight: 20 },
  time: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
});
