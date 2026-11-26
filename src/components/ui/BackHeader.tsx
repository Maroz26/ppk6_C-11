import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

// Tombol kembali berbentuk pil putih bergaris lavender (Figma: "< Jadwal Praktikum").
export function BackHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kembali dari ${title}`}
      onPress={onBack ?? (() => router.back())}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Feather name="chevron-left" size={20} color={color.purpleDeep} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 47,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: color.lavender,
    backgroundColor: color.card,
  },
  pressed: { opacity: 0.75 },
  title: { flex: 1, fontFamily: font.display, fontSize: 16, color: color.purpleDeep },
});
