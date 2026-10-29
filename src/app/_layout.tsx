import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SessionProvider } from '@/context/SessionContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <SessionProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </SessionProvider>
    </ThemeProvider>
  );
}
