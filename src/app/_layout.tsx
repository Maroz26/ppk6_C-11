import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { authReady, isLoggedIn, currentUser } = useApp();
  const ready = fontsReady && authReady;

  // Daftarkan token FCM & dengarkan notifikasi setelah login.
  usePushNotifications(currentUser?.id, ready && isLoggedIn);

  // Splash screen ditutup setelah font siap dan sesi login selesai dicek.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Belum login: hanya halaman login dan register. */}
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      {/* Sudah login: halaman ASSIST. Halaman index mengarahkan sesuai peran. */}
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="token-storage" options={{ headerShown: true, title: 'Uji Access Token' }} />
        <Stack.Screen name="identitas" />
        <Stack.Screen name="asisten" />
        <Stack.Screen name="praktikan" />
        <Stack.Screen name="sesi/form" />
        <Stack.Screen name="sesi/[id]" options={{ headerShown: true, title: 'Detail Sesi' }} />
        <Stack.Screen name="kelola/[id]" options={{ headerShown: true, title: 'Kelola Sesi' }} />
        <Stack.Screen name="rekap/[id]" options={{ headerShown: true, title: 'Rekap Kehadiran' }} />
        <Stack.Screen name="testAi" options={{ headerShown: true, title: 'Analisis AI' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  return (
    <AppProvider>
      <RootNavigator fontsReady={loaded || !!error} />
    </AppProvider>
  );
}