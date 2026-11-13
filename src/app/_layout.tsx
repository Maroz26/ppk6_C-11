import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from '@expo-google-fonts/poppins';
import { getAuth, onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useEffect, useState } from 'react';
import { AppProvider } from '../context/AppContext';

SplashScreen.preventAutoHideAsync();

// Bagikan pengguna yang sedang login ke halaman lain.
export const AuthContext = createContext<User | null>(null);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Pantau sesi login di satu tempat.
  useEffect(() => onAuthStateChanged(getAuth(), (currentUser) => {
    setUser(currentUser);
    setAuthReady(true);
  }), []);

  const fontsReady = loaded || !!error;

  // Splash screen ditutup setelah font siap dan sesi selesai dicek.
  useEffect(() => {
    if (fontsReady && authReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, authReady]);

  if (!fontsReady || !authReady) {
    return null;
  }

  return (
    <AuthContext.Provider value={user}>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Belum login: hanya halaman login yang bisa dibuka. */}
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          {/* Sudah login: semua halaman ASSIST bisa dibuka. */}
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="index" />
            <Stack.Screen name="identitas" />
            <Stack.Screen name="asisten" />
            <Stack.Screen name="praktikan" />
            <Stack.Screen name="sesi/[id]" options={{ headerShown: true, title: 'Detail Sesi' }} />
            <Stack.Screen name="kelola/[id]" options={{ headerShown: true, title: 'Kelola Sesi' }} />
            <Stack.Screen name="rekap/[id]" options={{ headerShown: true, title: 'Rekap Kehadiran' }} />
            <Stack.Screen name="testAi" options={{ headerShown: true, title: 'Analisis AI' }} />
          </Stack.Protected>
        </Stack>
      </AppProvider>
    </AuthContext.Provider>
  );
}