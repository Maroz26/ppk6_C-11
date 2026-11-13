import { StyleSheet } from 'react-native';

// Ubah palet di sini agar warna layar, input, dan navigasi tetap konsisten.
export const colors = {
  navy: '#17324D',
  peach: '#FFD2B8',
  teal: '#007F78',
  softTeal: '#B8DEDA',
  background: '#F5F7FA',
  muted: '#536779',
  error: '#A32939',
  white: '#FFFFFF',
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  background: { ...StyleSheet.absoluteFill },
  peach: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: colors.peach, top: -80, right: -100 },
  teal: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.softTeal, bottom: -60, left: -120 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40 },
  shadow: {
    width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 28,
    boxShadow: '0 12px 36px rgba(23,50,77,0.10)',
  },
  // Efek kaca berasal dari warna transparan dan border tipis, tanpa modul blur.
  card: {
    padding: 24, gap: 16, borderRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.48)',
  },
  button: { minHeight: 54, padding: 16, borderRadius: 16, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: '600' },
  eyebrow: { color: colors.teal, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: colors.navy, fontSize: 22, fontWeight: '700' },
  text: { color: colors.navy, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  label: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  input: {
    color: colors.navy, backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: 'rgba(23,50,77,0.16)', borderRadius: 16,
    padding: 16, fontSize: 16, minHeight: 54,
  },
  error: { color: colors.error, fontSize: 14, lineHeight: 22 },
});