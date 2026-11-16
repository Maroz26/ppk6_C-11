import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, styles } from '../theme';

// Halaman pertama setelah login: mengarahkan pengguna ke beranda sesuai perannya.
export default function IndexScreen() {
  const { profileReady, role, logout } = useApp();

  if (!profileReady) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  if (role === 'ASISTEN') return <Redirect href="/asisten" />;
  if (role === 'PRAKTIKAN') return <Redirect href="/praktikan" />;

  // Akun ada di Firebase Authentication, tetapi profilnya tidak ada di koleksi users.
  return (
    <View style={[styles.screen, styles.content]}>
      <View style={styles.shadow}>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Profil tidak ditemukan</Text>
          <Text style={styles.muted}>
            Akun ini belum memiliki data profil. Keluar, lalu daftar ulang lewat halaman Daftar.
          </Text>
          <Pressable accessibilityRole="button" onPress={logout} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.buttonLabel}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}