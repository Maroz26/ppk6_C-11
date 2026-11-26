import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { images } from '../../theme/assets';
import { color, roleTheme, RoleTone, shadow } from '../../theme/tokens';

type Tab = 'home' | 'profile';

// Navigasi bawah: pil berwarna tema dengan ikon beranda & profil, maskot di tengah.
// Asisten: maskot diberi tanda "+" untuk menambah sesi (Figma: Home Screen Asprak).
export function BottomNav({ active, onHome, onProfile, onMascot, tone = 'praktikan', mascotPlus = false }: {
  active: Tab;
  onHome: () => void;
  onProfile: () => void;
  onMascot?: () => void;
  tone?: RoleTone;
  mascotPlus?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = roleTheme[tone];
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={[styles.bar, { backgroundColor: theme.navBg }, shadow.float]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Beranda"
          accessibilityState={{ selected: active === 'home' }}
          onPress={onHome}
          hitSlop={10}
          style={styles.side}
        >
          <Feather name="home" size={21} color={active === 'home' ? theme.navIconActive : theme.navIcon} />
        </Pressable>
        <View style={styles.middleSpace} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil"
          accessibilityState={{ selected: active === 'profile' }}
          onPress={onProfile}
          hitSlop={10}
          style={styles.side}
        >
          <Feather name="user" size={21} color={active === 'profile' ? theme.navIconActive : theme.navIcon} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mascotPlus ? 'Tambah sesi' : 'Maskot ASSIST'}
        onPress={onMascot}
        disabled={!onMascot}
        style={({ pressed }) => [styles.mascotWrap, pressed && styles.pressed]}
      >
        <Image source={images.mascotHead} style={styles.mascot} resizeMode="contain" />
        {mascotPlus && (
          <View style={styles.plus} pointerEvents="none">
            <Feather name="plus" size={PLUS_SIZE} color={color.onDark} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

// Ukuran gambar kepala maskot di navigasi.
const MASCOT_W = 118;
const MASCOT_H = 124;
// Wajah maskot tidak di tengah gambar (telinga condong ke kanan).
// Titik tengah wajah diukur dari gambar dan Figma: 45,6% dari kiri, 58% dari atas.
// Kalau tanda + masih kurang pas, ubah dua angka ini.
const FACE_CENTER = { x: 0.456, y: 0.58 };
const PLUS_SIZE = 34;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    width: 235,
    height: 47,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  side: { width: 40, alignItems: 'center' },
  middleSpace: { flex: 1 },
  // Gambar kepala maskot termasuk ruang bayangan, jadi digeser supaya pas di tengah pil.
  mascotWrap: { position: 'absolute', bottom: -12, alignSelf: 'center', marginLeft: 16 },
  pressed: { opacity: 0.85 },
  mascot: { width: MASCOT_W, height: MASCOT_H },
  // Tanda + diletakkan tepat di tengah wajah, bukan di tengah gambar.
  plus: {
    position: 'absolute',
    left: Math.round(MASCOT_W * FACE_CENTER.x - PLUS_SIZE / 2),
    top: Math.round(MASCOT_H * FACE_CENTER.y - PLUS_SIZE / 2),
    width: PLUS_SIZE,
    height: PLUS_SIZE,
  },
});
