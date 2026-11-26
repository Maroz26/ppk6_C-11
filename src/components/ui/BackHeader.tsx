import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

type Variant = 'default' | 'onOrange' | 'onLavender';

// Tombol kembali berbentuk pil putih.
// - default: garis lavender, teks ungu (halaman berlatar putih).
// - onOrange: pil besar tanpa garis, teks oranye tua (Figma jadwal-prak).
// - onLavender: pil besar tanpa garis, teks ungu (Figma Kelola Sesi, form sesi).
export function BackHeader({ title, onBack, variant = 'default' }: {
  title: string;
  onBack?: () => void;
  variant?: Variant;
}) {
  const large = variant !== 'default';
  const tint = variant === 'onOrange' ? color.orangeDark : color.purpleDeep;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kembali dari ${title}`}
      onPress={onBack ?? (() => router.back())}
      style={({ pressed }) => [styles.pill, large ? styles.pillLarge : styles.pillDefault, pressed && styles.pressed]}
    >
      <Feather name="chevron-left" size={large ? 22 : 20} color={tint} />
      <Text style={[styles.title, { color: tint }, large && styles.titleLarge]} numberOfLines={1}>{title}</Text>
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
  pillLarge: { minHeight: 52, borderRadius: 35, paddingHorizontal: 18 },
  pressed: { opacity: 0.75 },
  title: { flex: 1, fontFamily: font.display, fontSize: 16 },
  titleLarge: { fontSize: 20 },
});
