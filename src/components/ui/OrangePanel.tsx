import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

// Kotak oranye berjudul dengan isi berwarna terang (Figma: "Daftar Praktikan").
// Dipakai di form sesi dan Detail Sesi.
export function OrangePanel({ title, right, children, style }: {
  title: string;
  right?: string; // teks kecil di kanan judul, misalnya "12/20 hadir"
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.box, style]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {!!right && <Text style={styles.right}>{right}</Text>}
      </View>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, paddingTop: 14, borderRadius: 34, backgroundColor: color.orange },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2, marginBottom: 12 },
  title: { flex: 1, fontFamily: font.display, fontSize: 20, color: color.onDark },
  right: {
    fontFamily: font.semibold,
    fontSize: 12,
    color: color.ink,
    backgroundColor: color.card,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  panel: { borderRadius: radius.card, backgroundColor: color.surface, padding: 14 },
});
