import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { color, font } from '../../theme/tokens';

// Kolom isian Login & Sign Up (Figma: abu muda, sudut 20, garis oranye).
// secure=true menambahkan tombol lihat/sembunyikan password.
export function AuthInput({ icon, secure, label, ...props }: TextInputProps & {
  icon: keyof typeof Feather.glyphMap;
  label: string; // untuk pembaca layar
  secure?: boolean;
}) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.boxFocused]}>
      <Feather name={icon} size={18} color={color.muted} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.placeholder}
        selectionColor={color.purpleDeep}
        style={styles.input}
        secureTextEntry={secure && hidden}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {secure && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Tampilkan password' : 'Sembunyikan password'}
          onPress={() => setHidden((v) => !v)}
          hitSlop={10}
        >
          <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={color.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.orange,
    backgroundColor: color.surface,
  },
  boxFocused: { borderWidth: 2, borderColor: color.orangeDark },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, color: color.ink, paddingVertical: 12 },
});
