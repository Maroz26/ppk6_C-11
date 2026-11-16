import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { authErrorMessage, registerUser, validateRegister } from '../services/authService';
import { colors, styles } from '../theme';
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
  const [message, setMessage] = useState('');

  async function register() {
    const input = { nama, nim, email, password, role };
    const invalid = validateRegister(input);
    if (invalid) {
      setMessage(invalid);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      // Setelah akun dibuat, pengguna otomatis login dan _layout.tsx
      // memindahkannya ke halaman sesuai peran.
      await registerUser(input);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function goToLogin() {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
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
            <Text style={[styles.title, localStyles.center]}>Daftar Akun</Text>

            <Text style={styles.label}>Nama lengkap</Text>
            <TextInput
              accessibilityLabel="Nama lengkap"
              placeholder="Nama lengkap"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              value={nama}
              onChangeText={setNama}
            />

            <Text style={styles.label}>NIM</Text>
            <TextInput
              accessibilityLabel="NIM"
              placeholder="NIM"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              value={nim}
              onChangeText={setNim}
              keyboardType="number-pad"
            />

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
              placeholder="Minimal 6 karakter"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Peran</Text>
            <View style={localStyles.roleRow}>
              {ROLES.map((item) => {
                const selected = role === item.value;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setRole(item.value)}
                    style={[localStyles.roleOption, selected && localStyles.roleSelected]}
                  >
                    <Text style={[styles.label, selected && localStyles.roleSelectedLabel]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [styles.button, { opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}
              onPress={register}
              disabled={busy}
            >
              <Text style={styles.buttonLabel}>{busy ? 'Memproses...' : 'Daftar'}</Text>
            </Pressable>

            <Pressable accessibilityRole="link" onPress={goToLogin} style={localStyles.linkWrap}>
              <Text style={styles.muted}>
                Sudah punya akun? <Text style={localStyles.link}>Login</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  center: { textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleOption: {
    flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(23,50,77,0.16)', backgroundColor: 'rgba(255,255,255,0.75)',
  },
  roleSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  roleSelectedLabel: { color: colors.white },
  linkWrap: { alignItems: 'center', padding: 4 },
  link: { color: colors.teal, fontWeight: '700' },
});