import { Stack } from 'expo-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
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