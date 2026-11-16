import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { palette } from '../theme';

// Tombol melayang menuju halaman jadwal, dipasang di atas beranda.
export function ScheduleShortcut({ href }: { href: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buka jadwal praktikum"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="calendar-outline" size={18} color={palette.navy} />
      <Text style={styles.label}>Jadwal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute', right: 20, bottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, minHeight: 48, borderRadius: 24,
    backgroundColor: palette.champagne, borderWidth: 1, borderColor: palette.taupe,
    elevation: 6,
    boxShadow: '0 6px 16px rgba(7,17,40,0.35)',
  },
  pressed: { opacity: 0.8 },
  label: { color: palette.navy, fontSize: 13, fontWeight: '700' },
});