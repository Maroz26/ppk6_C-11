import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17382D',
    background: '#F5F7F5',
    backgroundElement: '#FFFEFC',
    backgroundSelected: '#E5F2EB',
    textSecondary: '#68786F',
  },
  dark: {
    text: '#E1EAE4',
    background: '#0B1210',
    backgroundElement: '#141D19',
    backgroundSelected: '#1C2A23',
    textSecondary: '#A0AEA5',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** Font sans-serif bawaan iOS */
    sans: 'system-ui',
    /** Font serif bawaan iOS */
    serif: 'ui-serif',
    /** Font dengan sudut membulat */
    rounded: 'ui-rounded',
    /** Font dengan lebar setiap karakter yang sama */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
