import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

// Tombol kembali berbentuk pil putih.
// variant "default": garis lavender, teks ungu (untuk halaman berlatar putih).
// variant "onOrange": tanpa garis, teks oranye tua (Figma jadwal-prak, untuk halaman berlatar oranye).
export function BackHeader({ title, onBack, variant = 'default' }: {
  title: string;
  onBack?: () => void;
  variant?: 'default' | 'onOrange';
}) {
  const onOrange = variant === 'onOrange';
  const tint = onOrange ? color.orangeDark : color.purpleDeep;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kembali dari ${title}`}
      onPress={onBack ?? (() => router.back())}
      style={({ pressed }) => [styles.pill, onOrange ? styles.pillOnOrange : styles.pillDefault, pressed && styles.pressed]}
    >
      <Feather name="chevron-left" size={onOrange ? 22 : 20} color={tint} />
      <Text style={[styles.title, { color: tint }, onOrange && styles.titleLarge]} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    backgroundColor: color.card,
  },
  pillDefault: { minHeight: 47, borderRadius: radius.input, borderWidth: 2, borderColor: color.lavender },
  pillOnOrange: { minHeight: 52, borderRadius: 35, paddingHorizontal: 18 },
  pressed: { opacity: 0.75 },
  title: { flex: 1, fontFamily: font.display, fontSize: 16 },
  titleLarge: { fontSize: 20 },
});
