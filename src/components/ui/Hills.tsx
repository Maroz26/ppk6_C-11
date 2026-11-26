import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { color } from '../../theme/tokens';

// Hiasan bukit/awan di latar halaman, dibuat dari lingkaran besar supaya tidak perlu file gambar.
// Koordinat diambil dari frame Figma selebar 402, lalu diskalakan ke lebar layar.
const FIGMA_WIDTH = 402;

type Circle = { cx: number; top: number; r: number }; // titik tengah dari kiri, puncak dari atas, jari-jari
type Layer = { fill: string; circles: Circle[]; solidFrom?: number }; // solidFrom: mulai dari sini diisi penuh

const PRESETS: Record<'jadwal' | 'awan', { height: number; layers: Layer[] }> = {
  // Bukit cokelat di belakang kalender (Figma: jadwal-prak "Group 15").
  jadwal: {
    height: 100,
    layers: [
      {
        fill: color.brown,
        circles: [
          { cx: 0, top: 0, r: 52 },     // bukit kiri, paling tinggi
          { cx: 128, top: 34, r: 125 }, // bukit tengah yang lebar
          { cx: 432, top: 30, r: 150 }, // bukit kanan
        ],
      },
    ],
  },
  // Bukit ungu lalu awan putih (Figma: Kelola Sesi dan form sesi).
  // Di bawah awan halaman menjadi putih penuh.
  awan: {
    height: 260,
    layers: [
      {
        fill: color.purple,
        circles: [
          { cx: 10, top: 13, r: 140 },
          { cx: 380, top: 42, r: 140 },
        ],
        solidFrom: 125,
      },
      {
        fill: color.background,
        circles: [
          { cx: 54, top: 123, r: 84 },
          { cx: 167, top: 191, r: 50 },
          { cx: 281, top: 124, r: 84 },
          { cx: 420, top: 96, r: 80 },
        ],
        solidFrom: 200,
      },
    ],
  },
};

export type HillsPreset = keyof typeof PRESETS;

// Tinggi hiasan dalam satuan Figma (kalikan dengan lebar layar / 402 untuk ukuran sebenarnya).
export function hillsHeight(preset: HillsPreset) {
  return PRESETS[preset].height;
}

// hillColor mengganti warna lapisan bukit pertama (misalnya cokelat untuk halaman praktikan).
export function Hills({ preset = 'jadwal', hillColor }: { preset?: HillsPreset; hillColor?: string }) {
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  const { height } = PRESETS[preset];
  const layers = PRESETS[preset].layers.map((layer, i) => (i === 0 && hillColor ? { ...layer, fill: hillColor } : layer));
  return (
    <View pointerEvents="none" style={[styles.layer, { height: height * k }]}>
      {layers.map((layer, li) => (
        <View key={li} style={StyleSheet.absoluteFill}>
          {layer.circles.map((c) => (
            <View
              key={`${c.cx}-${c.top}`}
              style={{
                position: 'absolute',
                left: (c.cx - c.r) * k,
                top: c.top * k,
                width: c.r * 2 * k,
                height: c.r * 2 * k,
                borderRadius: c.r * k,
                backgroundColor: layer.fill,
              }}
            />
          ))}
          {layer.solidFrom !== undefined && (
            <View style={[styles.solid, { top: layer.solidFrom * k, backgroundColor: layer.fill }]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { width: '100%', overflow: 'hidden' },
  solid: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
