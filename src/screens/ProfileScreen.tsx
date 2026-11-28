// src/screens/ProfileScreen.tsx
// Profil pengguna (praktikan & asisten): data akun dan tombol keluar.
// Sprint 4: praktikan punya pintasan ke Denda & Pembayaran dan Riwayat Pembayaran.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '../components/ui/BackHeader';
import { BottomNav } from '../components/ui/BottomNav';
import { useApp } from '../context/AppContext';
import { images } from '../theme/assets';
import { color, font, layout, radius } from '../theme/tokens';

export default function ProfileScreen() {
  const { currentUser, role, logout } = useApp();
  const home = role === 'ASISTEN' ? '/asisten' : '/praktikan';

  function handleLogout() {
    logout();
    router.replace('/');
  }

  const rows: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [
    { icon: 'user', label: 'Nama', value: currentUser?.nama ?? '-' },
    { icon: 'hash', label: 'NIM', value: currentUser?.nim ?? '-' },
    { icon: 'mail', label: 'Email', value: currentUser?.email ?? '-' },
    { icon: 'award', label: 'Peran', value: role === 'ASISTEN' ? 'Asisten' : 'Praktikan' },
  ];

  // Pintasan khusus praktikan (Sprint 4).
  const links: { icon: keyof typeof Feather.glyphMap; label: string; href: '/pembayaran' | '/pembayaran/riwayat' }[] =
    role === 'PRAKTIKAN'
      ? [
          { icon: 'credit-card', label: 'Denda & Pembayaran', href: '/pembayaran' },
          { icon: 'clock', label: 'Riwayat Pembayaran', href: '/pembayaran/riwayat' },
        ]
      : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackHeader title="Profil" onBack={() => router.replace(home)} />

        <View style={styles.identity}>
          <Image source={images.mascotHead} style={styles.mascot} resizeMode="contain" />
          <Text style={styles.name} numberOfLines={2}>{currentUser?.nama ?? '-'}</Text>
          <Text style={styles.role}>{role === 'ASISTEN' ? 'Asisten praktikum' : 'Praktikan'}</Text>
        </View>

        <View style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.label} style={[styles.row, index > 0 && styles.rowBorder]}>
              <Feather name={row.icon} size={18} color={color.purpleDeep} />
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>

        {links.length > 0 && (
          <View style={styles.card}>
            {links.map((link, index) => (
              <Pressable
                key={link.href}
                accessibilityRole="button"
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.pressed]}
              >
                <Feather name={link.icon} size={18} color={color.purpleDeep} />
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Feather name="chevron-right" size={18} color={color.muted} />
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <Feather name="log-out" size={18} color={color.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </ScrollView>
      <BottomNav
        active="profile"
        tone={role === 'ASISTEN' ? 'asisten' : 'praktikan'}
        mascotPlus={role === 'ASISTEN'}
        onMascot={role === 'ASISTEN' ? () => router.push('/sesi/form') : undefined}
        onHome={() => router.replace(home)}
        onProfile={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { padding: layout.screenPadding, paddingBottom: layout.bottomNavSpace, gap: 20 },
  identity: { alignItems: 'center', gap: 2 },
  mascot: { width: 120, height: 126 },
  name: { fontFamily: font.display, fontSize: 24, color: color.ink, textAlign: 'center' },
  role: { fontFamily: font.medium, fontSize: 13, color: color.purpleDeep },
  card: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.divider },
  rowLabel: { width: 56, fontFamily: font.medium, fontSize: 13, color: color.muted },
  linkLabel: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: color.ink },
  rowValue: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: color.ink, textAlign: 'right' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: radius.input,
    backgroundColor: color.dangerSoft,
  },
  pressed: { opacity: 0.75 },
  logoutText: { fontFamily: font.semibold, fontSize: 14, color: color.danger },
});