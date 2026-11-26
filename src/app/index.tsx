import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { images } from '../theme/assets';
import { color, font, radius } from '../theme/tokens';

// Halaman pertama setelah login: mengarahkan pengguna ke beranda sesuai perannya.
// Saat profil masih dimuat (atau sedang keluar akun), tampil maskot dan indikator memuat.
export default function IndexScreen() {
  const { profileReady, role, logout, signingOut } = useApp();

  if (!profileReady || signingOut) {
    return (
      <View style={styles.screen}>
        <Image source={images.mascotHead} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color={color.plum} />
        <Text style={styles.loading}>{signingOut ? 'Keluar dari akun...' : 'Memuat profil...'}</Text>
      </View>
    );
  }

  if (role === 'ASISTEN') return <Redirect href="/asisten" />;
  if (role === 'PRAKTIKAN') return <Redirect href="/praktikan" />;

  // Akun ada di Firebase Authentication, tetapi profilnya tidak ada di koleksi users.
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Profil tidak ditemukan</Text>
        <Text style={styles.text}>
          Akun ini belum memiliki data profil. Keluar, lalu daftar ulang lewat halaman Sign Up.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Keluar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, backgroundColor: color.lavender },
  logo: { width: 84, height: 88 },
  loading: { fontFamily: font.medium, fontSize: 14, color: color.purpleInk },
  card: {
    alignSelf: 'stretch',
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.orange,
    padding: 24,
    gap: 10,
  },
  title: { fontFamily: font.display, fontSize: 22, color: color.ink, textAlign: 'center' },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft, textAlign: 'center' },
  button: { minHeight: 50, marginTop: 8, borderRadius: radius.pill, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: font.display, fontSize: 18, color: color.onDark },
  pressed: { opacity: 0.75 },
});
