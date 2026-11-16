// src/components/SentimentBadge.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BELUM_DIKLASIFIKASI } from '../services/reviewAiService';
import { colors } from '../theme/colors';

const toneFor = (label: string) => {
  const l = label.toUpperCase();
  if (l.includes('POS')) return colors.statusSoft.DIBUKA;
  if (l.includes('NEG')) return colors.statusSoft.DITUTUP;
  return colors.statusSoft.BELUM_DIBUKA;
};

export const SentimentBadge = ({ label }: { label: string }) => {
  const tone = toneFor(label);
  const text = label === BELUM_DIKLASIFIKASI ? 'Belum diklasifikasi' : label;
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: '700' },
});
