const palette = {
  navy: '#112250',
  sapphire: '#3B507D',
  taupe: '#BEB7A7',
  champagne: '#E7E2CE',
  ivory: '#F5F4F0',
};

export const colors = {
  // Brand
  primary: palette.navy,
  primaryDark: '#0B1738',
  primaryLight: palette.champagne,
  primarySoft: '#EFEBDD',

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
    DIBUKA: '#059669',
    DITUTUP: '#A64F58'
  },

  statusSoft: {
    BELUM_DIBUKA: { bg: palette.champagne, text: palette.sapphire },
    DIBUKA: { bg: '#D1FAE5', text: '#047857' },
    DITUTUP: { bg: '#F0E7E5', text: '#713D46' }
  }
};