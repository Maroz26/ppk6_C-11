import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { authErrorMessage, loginUser, validateLogin } from '../services/authService';
import { colors, styles } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  async function login() {
    const invalid = validateLogin(email, password);
    if (invalid) {
      setLoginError(invalid);
      return;
    }

    setBusy(true);
    setLoginError('');
    try {
      // Kalau berhasil, _layout.tsx yang memindahkan ke halaman sesuai peran.
      await loginUser(email, password);
    } catch (error) {
      setLoginError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.background} pointerEvents="none">
        <View style={styles.peach} />
        <View style={styles.teal} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.shadow}>
          <View style={styles.card}>
            <Text style={[styles.title, localStyles.center]}>Login</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              placeholder="Email"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              placeholder="Password"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [styles.button, { opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}
              onPress={login}
              disabled={busy}
            >
              <Text style={styles.buttonLabel}>{busy ? 'Memproses...' : 'Login'}</Text>
            </Pressable>

            <Pressable accessibilityRole="link" onPress={() => router.push('/register')} style={localStyles.linkWrap}>
              <Text style={styles.muted}>
                Belum punya akun? <Text style={localStyles.link}>Daftar</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal muncul saat input tidak valid atau Firebase menolak login. */}
      <Modal transparent animationType="fade" visible={!!loginError} onRequestClose={() => setLoginError('')}>
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.shadow}>
              <View style={styles.card}>
                <Text style={styles.subtitle}>Login tidak berhasil</Text>
                <Text style={styles.error} accessibilityRole="alert">{loginError}</Text>
                <Pressable accessibilityRole="button" onPress={() => setLoginError('')} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={styles.buttonLabel}>Tutup</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  center: { textAlign: 'center' },
  linkWrap: { alignItems: 'center', padding: 4 },
  link: { color: colors.teal, fontWeight: '700' },
});