import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProvider } from '../context/AppContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="identitas" />
        <Stack.Screen name="asisten" />
        <Stack.Screen name="praktikan" />
        <Stack.Screen name="sesi/[id]" options={{ headerShown: true, title: 'Detail Sesi' }} />
        <Stack.Screen name="kelola/[id]" options={{ headerShown: true, title: 'Kelola Sesi' }} />
        <Stack.Screen name="rekap/[id]" options={{ headerShown: true, title: 'Rekap Kehadiran' }} />
      </Stack>
    </AppProvider>
  );
}