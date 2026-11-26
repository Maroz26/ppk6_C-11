// src/theme/tokens.ts
// Sistem desain ASSIST (redesign, sumber: Figma "ASSIST").
// Semua halaman baru WAJIB mengambil warna, font, radius, dan jarak dari file ini.
// Jangan menulis kode warna langsung di file screen.

// ===== Warna =====
export const color = {
  // Merek
  orange: '#D2A07F',        // Figma #DE9B6E, saturasi diturunkan agar di layar HP tidak terlalu menyala  orangeDark: '#B8754A',    // teks/ikon di atas permukaan terang yang butuh nuansa oranye
  lavender: '#DEAEF8',      // kotak menu, garis tepi kartu, latar halaman auth
  lavenderSoft: '#F3E3FB',  // latar lembut (chip tidak aktif, sorotan tipis)
  purple: '#A580BA',        // aksen dekoratif (garis pemisah, ilustrasi)
  purpleDeep: '#816491',    // teks sapaan, ikon, tombol utama (kontras putih 5:1)
  purpleInk: '#5E3F70',     // teks di atas lavender

  // Permukaan
  background: '#FFFFFF',    // latar halaman
  surface: '#F5F5F3',       // isi kartu & kolom isian
  card: '#FFFFFF',

  // Teks
  ink: '#363636',           // judul
  inkSoft: '#3B373C',       // isi
  muted: '#7A7380',         // keterangan
  onDark: '#FFFFFF',        // teks di atas oranye/ungu

  // Garis
  border: '#DEAEF8',
  divider: '#E6E1EA',

  // Status
  success: '#3E8E63',
  successSoft: '#DDF1E5',
  warning: '#B7791F',
  warningSoft: '#FBEFD6',
  danger: '#B4474F',
  dangerSoft: '#F8E3E4',
  info: '#816491',
  infoSoft: '#F3E3FB',

  // Aksen dari ilustrasi maskot
  lime: '#D4EC8C',
  mint: '#CDF2E8',          // Figma #CAFFF2, saturasi diturunkan agar di layar HP tidak terlalu menyala. Tema asisten: kartu sorotan, kotak menu, tombol kartu
} as const;

// ===== Tema per peran =====
// Praktikan: latar putih, kartu sorotan oranye, aksen lavender (Figma: Home Screen Praktikan).
// Asisten: latar oranye, kartu sorotan mint, navigasi lavender (Figma: Home Screen Asprak).
export type RoleTone = 'praktikan' | 'asisten';

export const roleTheme = {
  praktikan: {
    page: color.background,
    greeting: color.purpleDeep,
    bell: color.purpleDeep,
    heroBg: color.orange,
    heroText: color.onDark,
    tileBg: color.lavender,
    tileLabel: color.ink,
    iconTint: undefined as string | undefined, // ikon PNG sudah berwarna ungu
    divider: color.purple,
    sectionTitle: color.ink,
    cardBorder: color.lavender,
    buttonBg: color.purpleDeep,
    buttonText: color.onDark,
    navBg: color.orange,
    navIcon: color.purpleInk,
    navIconActive: color.onDark,
  },
  asisten: {
    page: color.orange,
    greeting: color.mint,
    bell: color.mint,
    heroBg: color.mint,
    heroText: color.ink,
    tileBg: color.mint,
    tileLabel: color.ink,
    iconTint: color.ink as string | undefined, // ikon PNG diwarnai gelap seperti di Figma
    divider: color.mint,
    sectionTitle: color.ink,
    cardBorder: color.mint,
    buttonBg: color.mint,
    buttonText: color.ink,
    navBg: color.lavender,
    navIcon: color.purpleInk,
    navIconActive: color.ink,
  },
} as const;

// Warna status sesi, dipakai badge di seluruh aplikasi.
export const sessionStatusColor = {
  BELUM_DIBUKA: { bg: color.lavenderSoft, text: color.purpleInk, label: 'Belum dibuka' },
  DIBUKA: { bg: color.successSoft, text: color.success, label: 'Dibuka' },
  DITUTUP: { bg: color.dangerSoft, text: color.danger, label: 'Ditutup' },
} as const;

// ===== Font =====
// Dimuat di src/app/_layout.tsx. fontWeight tidak dipakai bersama fontFamily
// karena di Android ketebalan ditentukan oleh nama font.
export const font = {
  display: 'LilitaOne_400Regular', // judul, angka besar, label tombol besar
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  semiboldItalic: 'Poppins_600SemiBold_Italic',
  bold: 'Poppins_700Bold',
} as const;

// Gaya teks siap pakai (ukuran dari Figma, frame 402 x 874).
export const type = {
  hero: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: color.onDark },
  h1: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.ink },
  h2: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: color.ink },
  h3: { fontFamily: font.display, fontSize: 16, lineHeight: 22, color: color.ink },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },
  bodyStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 21, color: color.ink },
  small: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: color.muted },
  label: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.ink },
  button: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: color.onDark },
} as const;

// ===== Ukuran =====
export const radius = {
  sm: 10,
  button: 12,
  input: 15,
  card: 20,
  tile: 25,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Lebar isi standar mengikuti Figma: margin kiri-kanan 24 pada layar 402.
export const layout = {
  screenPadding: 24,
  bottomNavHeight: 47,
  bottomNavSpace: 120, // ruang kosong di bawah daftar supaya tidak tertutup navigasi
} as const;

export const shadow = {
  // Dari Figma: 0 4 4 rgba(0,0,0,0.25) pada navigasi bawah.
  float: {
    boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
    elevation: 4,
  },
} as const;
