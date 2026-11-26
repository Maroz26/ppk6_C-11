// src/screens/RegisterScreen.tsx
// Sign Up (redesign, Figma: "logo-screen"). Logika daftar sama seperti sebelumnya:
// akun dibuat di Firebase Authentication, profil disimpan ke users/{uid},
// lalu _layout.tsx memindahkan pengguna ke beranda sesuai peran.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthInput } from '../components/ui/AuthInput';
import { AuthLayout } from '../components/ui/AuthLayout';
import { authErrorMessage, registerUser, validateRegister } from '../services/authService';
import { color, font, radius } from '../theme/tokens';
import { Role } from '../types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'PRAKTIKAN', label: 'Praktikan' },
  { value: 'ASISTEN', label: 'Asisten' },
];

export default function RegisterScreen() {
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function register() {
    const input = { nama, nim, email, password, role };
    const invalid = validateRegister(input);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await registerUser(input);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function goToLogin() {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }

  const clear = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setError('');
  };

  return (
    <AuthLayout title="Sign Up">
      <View style={styles.roles} accessibilityRole="radiogroup" accessibilityLabel="Daftar sebagai">
        {ROLES.map((item) => {
          const active = role === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => clear(setRole)(item.value)}
              style={({ pressed }) => [styles.role, active && styles.roleActive, pressed && styles.pressed]}
            >
              <Text style={[styles.roleText, active && styles.roleTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <AuthInput icon="user" label="Nama lengkap" placeholder="Nama lengkap" value={nama} onChangeText={clear(setNama)} autoComplete="name" />
      <AuthInput icon="hash" label="NIM" placeholder="NIM" value={nim} onChangeText={clear(setNim)} keyboardType="number-pad" />
      <AuthInput
        icon="mail"
        label="Email"
        placeholder="Email"
        value={email}
        onChangeText={clear(setEmail)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <AuthInput
        icon="lock"
        label="Password, minimal 6 karakter"
        placeholder="Password (min. 6 karakter)"
        secure
        value={password}
        onChangeText={clear(setPassword)}
        autoCapitalize="none"
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={register}
      />

      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={register}
        style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}
      >
        <Text style={styles.buttonText}>{busy ? 'Mendaftarkan...' : 'Daftar'}</Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={goToLogin} hitSlop={8} style={styles.linkWrap}>
        <Text style={styles.linkText}>
          Sudah punya akun? <Text style={styles.link}>Login</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  roles: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.orange,
    backgroundColor: color.surface,
  },
  role: { flex: 1, minHeight: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleActive: { backgroundColor: color.plum },
  roleText: { fontFamily: font.semibold, fontSize: 14, color: color.purpleInk },
  roleTextActive: { color: color.onDark },
  error: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 19,
    color: color.danger,
    backgroundColor: color.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
  },
  button: {
    minHeight: 54,
    marginTop: 10,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: font.display, fontSize: 20, color: color.onDark },
  linkWrap: { alignSelf: 'center', paddingVertical: 6 },
  linkText: { fontFamily: font.regular, fontSize: 14, color: color.inkSoft },
  link: { fontFamily: font.semibold, color: color.purpleDeep, textDecorationLine: 'underline' },
});
