import { colors } from '@/theme/colors';
import { createMMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const TOKEN_KEY = 'join_access_token';

export default function TokenStorageScreen() {
  const [token, setToken] = useState(() => `join_${Date.now().toString(36)}`);
  const [asyncResult, setAsyncResult] = useState('Belum diuji');
  const [mmkvState] = useState(() => {
    try {
      return { storage: createMMKV({ id: 'auth-token-storage' }), error: null };
    } catch (error) {
      console.warn('[MMKV] UNAVAILABLE: native development build required', error);
      return { storage: null, error };
    }
  });
  const [mmkvResult, setMmkvResult] = useState(
    mmkvState.storage ? 'Belum diuji' : 'Perlu native development build (tidak tersedia di Expo Go)',
  );

  const saveAsyncStorage = async () => {
    const value = token.trim();
    if (!value) {
      Alert.alert('Token kosong', 'Masukkan access token join terlebih dahulu.');
      return;
    }

    try {
      await AsyncStorage.setItem(TOKEN_KEY, value);
      console.log('[AsyncStorage] SAVE SUCCESS', { key: TOKEN_KEY, value });
      setAsyncResult('Berhasil disimpan');
    } catch (error) {
      console.error('[AsyncStorage] SAVE FAILED', error);
      setAsyncResult('Gagal menyimpan');
    }
  };

  const getAsyncStorage = async () => {
    try {
      const value = await AsyncStorage.getItem(TOKEN_KEY);
      console.log('[AsyncStorage] GET SUCCESS', { key: TOKEN_KEY, value });
      setAsyncResult(value === null ? 'Belum ada data' : `Berhasil get: ${value}`);
    } catch (error) {
      console.error('[AsyncStorage] GET FAILED', error);
      setAsyncResult('Gagal membaca');
    }
  };

  const saveMMKV = () => {
    const value = token.trim();
    if (!value) {
      Alert.alert('Token kosong', 'Masukkan access token join terlebih dahulu.');
      return;
    }
    if (!mmkvState.storage) {
      setMmkvResult('Perlu native development build (tidak tersedia di Expo Go)');
      return;
    }

    try {
      mmkvState.storage.set(TOKEN_KEY, value);
      console.log('[MMKV] SAVE SUCCESS', { key: TOKEN_KEY, value });
      setMmkvResult('Berhasil disimpan');
    } catch (error) {
      console.error('[MMKV] SAVE FAILED', error);
      setMmkvResult('Gagal menyimpan');
    }
  };

  const getMMKV = () => {
    if (!mmkvState.storage) {
      setMmkvResult('Perlu native development build (tidak tersedia di Expo Go)');
      return;
    }
    try {
      const value = mmkvState.storage.getString(TOKEN_KEY) ?? null;
      console.log('[MMKV] GET SUCCESS', { key: TOKEN_KEY, value });
      setMmkvResult(value === null ? 'Belum ada data' : `Berhasil get: ${value}`);
    } catch (error) {
      console.error('[MMKV] GET FAILED', error);
      setMmkvResult('Gagal membaca');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Uji Penyimpanan Token Join</Text>
      <Text style={styles.description}>
        Simpan dan baca access token yang sama dengan AsyncStorage dan MMKV.
      </Text>

      <Text style={styles.label}>Access token</Text>
      <TextInput
        accessibilityLabel="Access token join"
        autoCapitalize="none"
        onChangeText={setToken}
        style={styles.input}
        value={token}
      />
      <Text style={styles.key}>Key: {TOKEN_KEY}</Text>

      <View style={styles.storageSection}>
        <Text style={styles.resultTitle}>AsyncStorage</Text>
        <View style={styles.actions}>
          <Pressable onPress={saveAsyncStorage} style={[styles.button, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Save AsyncStorage</Text>
          </Pressable>
          <Pressable onPress={getAsyncStorage} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Get AsyncStorage</Text>
          </Pressable>
        </View>
        <View style={styles.resultCard}>
          <Text selectable style={styles.resultText}>{asyncResult}</Text>
        </View>
      </View>
      <View style={styles.storageSection}>
        <Text style={styles.resultTitle}>MMKV</Text>
        <View style={styles.actions}>
          <Pressable onPress={saveMMKV} style={[styles.button, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Save MMKV</Text>
          </Pressable>
          <Pressable onPress={getMMKV} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Get MMKV</Text>
          </Pressable>
        </View>
        <View style={styles.resultCard}>
          <Text selectable style={styles.resultText}>{mmkvResult}</Text>
        </View>
      </View>
      <Text style={styles.hint}>Gunakan tombol AsyncStorage di Expo Go. MMKV perlu native development build.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    marginBottom: 8,
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    marginBottom: 24,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    marginBottom: 8,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  key: {
    marginTop: 8,
    marginBottom: 20,
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    gap: 10,
    marginBottom: 20,
  },
  storageSection: { marginBottom: 8 },
  button: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  resultTitle: {
    marginBottom: 4,
    color: colors.text,
    fontWeight: '700',
  },
  resultText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  hint: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
