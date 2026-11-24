// src/hooks/usePushNotifications.ts
// Foreground (Alert), background & app mati (tap notifikasi → buka halaman terkait).
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  PushStatus,
  listenTokenRefresh,
  registerPushToken,
} from '../services/notificationService';

export function usePushNotifications(userId: string | undefined, enabled: boolean) {
  const router = useRouter();
  const [status, setStatus] = useState<PushStatus>(Platform.OS === 'web' ? 'UNSUPPORTED' : 'ERROR');

  useEffect(() => {
    if (Platform.OS === 'web' || !userId || !enabled) return;
    const messaging = getMessaging();

    const go = (data?: { [k: string]: string | object }) => {
      const type = data?.type as string | undefined;
      if (type === 'PERMISSION_NEW') router.push('/asisten/izin');
      else if (type === 'PERMISSION_DECIDED') router.push('/praktikan/izin');
      else if (data?.sessionId) {
        router.push({ pathname: '/sesi/[id]', params: { id: String(data.sessionId) } });
      }
    };

    registerPushToken(userId).then((s) => {
      setStatus(s);
      if (s === 'DENIED') {
        Alert.alert(
          'Notifikasi dimatikan',
          'Kamu tidak akan menerima info sesi dibuka, perubahan jadwal, atau keputusan izin. Aktifkan di Pengaturan.',
          [
            { text: 'Nanti', style: 'cancel' },
            { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
          ],
        );
      }
    });
    const offRefresh = listenTokenRefresh(userId);

    // Foreground: FCM tidak menampilkan notifikasi sistem, jadi tampilkan sendiri.
    const offMessage = onMessage(messaging, async (msg) => {
      Alert.alert(msg.notification?.title ?? 'ASSIST', msg.notification?.body ?? '', [
        { text: 'Tutup', style: 'cancel' },
        { text: 'Lihat', onPress: () => go(msg.data) },
      ]);
    });

    // Background → tap notifikasi
    const offOpened = onNotificationOpenedApp(messaging, (msg) => go(msg.data));

    // App mati total → dibuka lewat notifikasi
    getInitialNotification(messaging).then((msg) => msg && go(msg.data));

    return () => {
      offRefresh();
      offMessage();
      offOpened();
    };
  }, [userId, enabled]);

  // status === 'DENIED' → tampilkan banner dan panggil openSettings.
  const openSettings = () => Linking.openSettings();
  return { status, openSettings };
}
