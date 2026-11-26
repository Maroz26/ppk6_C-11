import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { color } from '../../theme/tokens';

// Bukit cokelat di belakang kalender (Figma: jadwal-prak "Group 15").
// Dibuat dari beberapa lingkaran besar supaya tidak perlu file gambar.
// Koordinat diambil dari frame Figma selebar 402, lalu diskalakan ke lebar layar.
const FIGMA_WIDTH = 402;
export const HILLS_HEIGHT = 100; // dari puncak bukit tertinggi sampai bagian cokelat yang rata

// cx = titik tengah lingkaran (dari kiri), top = puncak lingkaran (dari atas lapisan), r = jari-jari
const CIRCLES = [
  { cx: 0, top: 0, r: 52 },     // bukit kiri, paling tinggi
  { cx: 128, top: 34, r: 125 }, // bukit tengah yang lebar
  { cx: 432, top: 30, r: 150 }, // bukit kanan
];

export function Hills({ fill = color.brown }: { fill?: string }) {
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  return (
    <View pointerEvents="none" style={[styles.layer, { height: HILLS_HEIGHT * k }]}>
      {CIRCLES.map((c) => (
        <View
          key={c.cx}
          style={{
            position: 'absolute',
            left: (c.cx - c.r) * k,
            top: c.top * k,
            width: c.r * 2 * k,
            height: c.r * 2 * k,
            borderRadius: c.r * k,
            backgroundColor: fill,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { width: '100%', overflow: 'hidden' },
});
