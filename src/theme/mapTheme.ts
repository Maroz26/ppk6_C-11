// src/theme/mapTheme.ts
// Semua warna dan pengaturan tampilan peta dikumpulkan di sini.
// Saat UI dirombak, cukup ubah file ini (dan file screen), tanpa menyentuh hook/servis.
import { palette } from '../theme';

// Peta dasar gratis tanpa API key (OpenFreeMap, data © OpenStreetMap).
// Pilihan lain: 'https://tiles.openfreemap.org/styles/liberty' (lebih berwarna).
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

// Titik awal kamera: area laboratorium Informatika.
export const DEFAULT_CENTER = { latitude: -7.0484, longitude: 110.4412 };
export const DEFAULT_ZOOM = 17.2;
export const FOCUS_ZOOM = 18;

export const mapColors = {
  pinFree: palette.sapphire,     // lab kosong
  pinBusy: '#8A3B48',            // lab sedang dipakai
  pinSelected: palette.navy,     // lab yang sedang dipilih
  pinDot: palette.champagne,
  radiusFill: palette.sapphire,
  radiusFillOpacity: 0.12,
  radiusLine: palette.sapphire,
  user: '#2F7BEF',               // titik posisi pengguna
  userHalo: 'rgba(47,123,239,0.18)',
  userBorder: '#FFFFFF',
};
