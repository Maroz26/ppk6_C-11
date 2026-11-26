// src/theme/assets.ts
// Gambar dari Figma (diekspor PNG 3x). Semua pemakaian gambar UI lewat file ini.
export const images = {
  mascotHead: require('../../assets/images/ui/mascot-head.png'),
  // Ekspor bingkai "Group 4 1" dari Figma: praktikan tanpa kacamata, asisten berkacamata.
  mascotHero: require('../../assets/images/ui/mascot-hero.png'),
  mascotHeroAsisten: require('../../assets/images/ui/mascot-hero-asisten.png'),
  mascotPaw: require('../../assets/images/ui/mascot-paw.png'),
} as const;

export const menuIcons = {
  presensi: require('../../assets/images/ui/icon-presensi.png'),
  jadwal: require('../../assets/images/ui/icon-jadwal.png'),
  perizinan: require('../../assets/images/ui/icon-perizinan.png'),
  rekap: require('../../assets/images/ui/icon-rekap.png'),
  ulasan: require('../../assets/images/ui/icon-ulasan.png'),
  peta: require('../../assets/images/ui/icon-peta.png'),
} as const;

export type MenuIconName = keyof typeof menuIcons;
