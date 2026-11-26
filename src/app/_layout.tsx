import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_600SemiBold_Italic,
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
  const { authReady, isLoggedIn, signingOut, currentUser } = useApp();
  const ready = fontsReady && authReady;

  // Daftarkan token FCM & dengarkan notifikasi setelah login.
  // Dimatikan selama logout supaya token tidak terdaftar ulang.
  usePushNotifications(currentUser?.id, ready && isLoggedIn && !signingOut);

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
        <Stack.Screen name="asisten" />
        <Stack.Screen name="praktikan" />
        <Stack.Screen name="sesi/form" />
        <Stack.Screen name="lab/form" />
        <Stack.Screen name="peta" />
        <Stack.Screen name="profil" />
        <Stack.Screen name="notifikasi" />
        <Stack.Screen name="sesi/[id]" />
        <Stack.Screen name="testAi" options={{ headerShown: true, title: 'Analisis AI' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Font sistem desain baru (lihat src/theme/tokens.ts).
  const [loaded, error] = useFonts({
    LilitaOne_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_600SemiBold_Italic,
    Poppins_700Bold,
  });

  return (
    <AppProvider>
      <RootNavigator fontsReady={loaded || !!error} />
    </AppProvider>
  );
}