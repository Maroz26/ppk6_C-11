import { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../theme/assets';
import { color, font, radius } from '../../theme/tokens';

// Kerangka halaman Login & Sign Up (Figma: "logo-screen").
// Latar lavender, kepala maskot, kartu putih bergaris oranye, dan bukit hijau berumput di bawah.
const FIGMA_WIDTH = 402;
const FIGMA_HEIGHT = 874;
// Bukit: lingkaran besar dengan puncak di y 620 (diukur dari bawah layar supaya selalu menempel di bawah).
const HILL = { cx: 190, top: 620, r: 331 };
const GRASS = [
  { x: 44, y: 680 },
  { x: 163, y: 753 },
  { x: 315, y: 770 },
];

function Grass({ left, bottom }: { left: number; bottom: number }) {
  return (
    <View style={[styles.grass, { left, bottom }]}>
      <View style={[styles.blade, { height: 18 }]} />
      <View style={[styles.blade, { height: 28 }]} />
      <View style={[styles.blade, { height: 20 }]} />
    </View>
  );
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  const fromBottom = (y: number) => (FIGMA_HEIGHT - y) * k;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Bukit hijau tetap di bawah layar, kartu bergulir di atasnya. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            styles.hill,
            {
              left: (HILL.cx - HILL.r) * k,
              bottom: fromBottom(HILL.top) - HILL.r * 2 * k,
              width: HILL.r * 2 * k,
              height: HILL.r * 2 * k,
              borderRadius: HILL.r * k,
            },
          ]}
        />
        {GRASS.map((g) => (
          <Grass key={g.x} left={g.x * k} bottom={fromBottom(g.y) - 28} />
        ))}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image source={images.mascotHead} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo ASSIST" />
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.lavender },
  hill: { position: 'absolute', backgroundColor: color.lime, borderWidth: 2, borderColor: color.limeDark },
  grass: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  blade: { width: 4, borderRadius: 2, backgroundColor: color.grass },
  content: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 36, paddingTop: 90, paddingBottom: 32 },  logo: { width: 84, height: 88, alignSelf: 'center', marginBottom: 18 },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.orange,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 14,
  },
  title: { fontFamily: font.display, fontSize: 24, color: color.ink, textAlign: 'center', marginBottom: 12 },
});
