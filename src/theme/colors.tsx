// REDESIGN: nilai disesuaikan dengan src/theme/tokens.ts. Nama kunci dipertahankan
// sementara untuk halaman yang belum didesain ulang.
import { color } from './tokens';

const palette = {
  navy: '#6E4F80',
  sapphire: color.purpleDeep,
  taupe: color.lavender,
  champagne: '#EBD5F7',
  ivory: color.surface,
};

export const colors = {
  // Brand
  primary: palette.navy,
  primaryDark: color.purpleInk,
  primaryLight: palette.champagne,
  primarySoft: color.lavenderSoft,

  // Surface
  background: palette.ivory,
  card: '#FFFFFF',
  border: palette.champagne,

  // Text
  text: palette.navy,
  textSecondary: palette.sapphire,
  textOnPrimary: palette.ivory,

  status: {
    BELUM_DIBUKA: palette.sapphire,
    DIBUKA: color.success,
    DITUTUP: color.danger
  },

  statusSoft: {
    BELUM_DIBUKA: { bg: palette.champagne, text: palette.sapphire },
    DIBUKA: { bg: color.successSoft, text: color.success },
    DITUTUP: { bg: color.dangerSoft, text: color.danger }
  }
};