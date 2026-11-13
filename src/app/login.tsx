import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, styles } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  async function login() {
    // Tolak form kosong sebelum mengirim permintaan.
    if (!email.trim() || !password) {
      setLoginError('Email dan password wajib diisi.');
      return;
    }

    setBusy(true);
    setLoginError('');
    try {
      // Kalau berhasil, _layout.tsx yang akan memindahkan ke halaman utama.
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    } catch {
      setLoginError('Login gagal. Periksa email dan password akun uji, lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.background} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.peach} />
        <View style={styles.teal} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.shadow}>
          <View style={styles.card}>
            <Text style={[styles.title, localStyles.title]}>Login</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              placeholder="Password"
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
          </View>
        </View>
      </ScrollView>
      {/* Modal muncul saat form kosong atau Firebase menolak login. */}
      <Modal
        transparent
        animationType="fade"
        visible={!!loginError}
        onRequestClose={() => setLoginError('')}
      >
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
  title: { textAlign: 'center' },
});