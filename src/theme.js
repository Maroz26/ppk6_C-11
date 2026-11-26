import { StyleSheet } from 'react-native';

// REDESIGN: palet lama (navy) sudah diganti. Nama kuncinya dipertahankan sementara
// supaya halaman yang belum didesain ulang tetap jalan, tapi nilainya memakai
// warna baru dari src/theme/tokens.ts. Halaman baru jangan memakai `palette`.
import { color } from './theme/tokens';

export const palette = {
  navy: '#6E4F80',            // dulu latar gelap & teks utama -> ungu tua
  sapphire: color.purpleDeep, // dulu teks sekunder
  taupe: color.lavender,      // dulu garis tepi & label kecil
  champagne: '#EBD5F7',       // dulu latar terang / teks di atas latar gelap
  ivory: color.surface,       // dulu kartu & teks terang
};

// Nama lama dipertahankan supaya halaman yang sudah ada tidak perlu diubah.
export const colors = {
  navy: palette.navy,
  teal: palette.sapphire,
  softTeal: palette.sapphire,
  peach: palette.champagne,
  background: palette.navy,
  muted: '#7C879B',
  error: '#713D46',
  white: '#FFFFFF',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.navy },
  background: { display: 'none' },
  peach: { display: 'none' },
  teal: { display: 'none' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 36 },
  shadow: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { padding: 18, gap: 12, borderRadius: 20, backgroundColor: palette.ivory },
  button: {
    minHeight: 48, paddingHorizontal: 16, borderRadius: 13, backgroundColor: palette.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonLabel: { color: palette.ivory, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: palette.taupe, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: palette.navy, fontSize: 26, fontWeight: '700' },
  subtitle: { color: palette.navy, fontSize: 18, fontWeight: '700' },
  text: { color: palette.navy, fontSize: 13, lineHeight: 20 },
  muted: { color: palette.sapphire, fontSize: 12, lineHeight: 18 },
  label: { color: palette.navy, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 52, borderWidth: 1, borderColor: palette.taupe, borderRadius: 13,
    backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 12,
    color: palette.navy, fontSize: 14,
  },
  error: {
    color: '#713D46', backgroundColor: '#F0E7E5', borderRadius: 10, padding: 10,
    fontSize: 12, lineHeight: 18,
  },
});