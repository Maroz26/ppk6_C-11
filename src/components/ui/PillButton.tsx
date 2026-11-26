import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { color, font, radius, roleTheme, RoleTone } from '../../theme/tokens';

type Variant = 'primary' | 'soft';

// Tombol kecil bersudut 12 (dari kartu sesi di Figma).
// primary mengikuti warna tema peran; soft = lavender muda.
export function PillButton({ label, onPress, variant = 'primary', tone = 'praktikan', style, disabled }: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  tone?: RoleTone;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const theme = roleTheme[tone];
  const bg = variant === 'primary' ? theme.buttonBg : color.lavenderSoft;
  const fg = variant === 'primary' ? theme.buttonText : color.purpleInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, { backgroundColor: bg }, (pressed || disabled) && styles.pressed, style]}
    >
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pressed: { opacity: 0.75 },
  label: { fontFamily: font.semibold, fontSize: 13 },
});
