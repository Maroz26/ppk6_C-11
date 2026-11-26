// Rute halaman Peta laboratorium.
// Layar peta dimuat saat rute dibuka (bukan saat aplikasi dibuka), supaya
// dev build lama yang belum berisi MapLibre tidak membuat seluruh aplikasi crash.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentType, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { color, font, radius } from '../theme/tokens';

function loadMapScreen(): ComponentType | null {
  try {
    return require('../screens/LabMapScreen').default as ComponentType;
  } catch (error) {
    console.warn('Halaman peta tidak dapat dimuat', error);
    return null;
  }
}

export default function PetaRoute() {
  const MapScreen = useMemo(loadMapScreen, []);
  if (MapScreen) return <MapScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: color.lavender, justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: color.card, borderRadius: radius.card, padding: 20, gap: 10 }}>
        <Ionicons name="map-outline" size={28} color={color.purpleDeep} />
        <Text style={{ fontFamily: font.display, color: color.ink, fontSize: 22 }}>Peta belum tersedia</Text>
        <Text style={{ fontFamily: font.regular, color: color.inkSoft, fontSize: 13, lineHeight: 19 }}>
          Versi aplikasi ini belum mendukung peta. Pasang dev build terbaru, lalu buka lagi halaman ini.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ minHeight: 50, borderRadius: radius.pill, backgroundColor: color.plum, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: font.display, color: color.onDark, fontSize: 18 }}>Kembali</Text>
        </Pressable>
      </View>
    </View>
  );
}
