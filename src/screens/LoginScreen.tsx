// src/screens/LoginScreen.tsx
// Login (redesign, Figma: "logo-screen"). Logika login sama seperti sebelumnya:
// kalau berhasil, _layout.tsx memindahkan pengguna ke beranda sesuai peran.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthInput } from '../components/ui/AuthInput';
import { AuthLayout } from '../components/ui/AuthLayout';
import { authErrorMessage, loginUser, validateLogin } from '../services/authService';
import { color, font, radius } from '../theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    const invalid = validateLogin(email, password);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await loginUser(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Login">
      <AuthInput
        icon="mail"
        label="Email"
        placeholder="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <AuthInput
        icon="lock"
        label="Password"
        placeholder="Password"
        secure
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={login}
      />

      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={login}
        style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}
      >
        <Text style={styles.buttonText}>{busy ? 'Memproses...' : 'Masuk'}</Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={() => router.push('/register')} hitSlop={8} style={styles.linkWrap}>
        <Text style={styles.linkText}>
          Belum punya akun? <Text style={styles.link}>Sign Up</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
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
