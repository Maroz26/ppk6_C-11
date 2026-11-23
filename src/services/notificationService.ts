// src/services/notificationService.ts
// Izin notifikasi + pengelolaan token FCM di users/{uid}.fcmTokens.
import { arrayRemove, arrayUnion, doc, updateDoc } from '@react-native-firebase/firestore';
import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../types';

const messaging = getMessaging();

export type PushStatus = 'GRANTED' | 'DENIED' | 'ERROR' | 'UNSUPPORTED';

const isGranted = (s: number) =>
  s === AuthorizationStatus.AUTHORIZED || s === AuthorizationStatus.PROVISIONAL;

// Minta izin lalu daftarkan token perangkat ke profil pengguna.
export async function registerPushToken(uid: string): Promise<PushStatus> {
  try {
    const status = await requestPermission(messaging); // Android 13+ memunculkan dialog sistem
    if (!isGranted(status)) return 'DENIED';

    const token = await getToken(messaging);
    await updateDoc(doc(db, COLLECTIONS.users, uid), { fcmTokens: arrayUnion(token) });
    return 'GRANTED';
  } catch (e) {
    console.warn('registerPushToken gagal', e);
    return 'ERROR';
  }
}

// Token bisa berganti sewaktu-waktu; simpan yang baru.
export function listenTokenRefresh(uid: string) {
  return onTokenRefresh(messaging, async (token) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.users, uid), { fcmTokens: arrayUnion(token) });
    } catch {}
  });
}

// Panggil SEBELUM signOut (rules butuh user masih login).
export async function unregisterPushToken(uid: string) {
  try {
    const token = await getToken(messaging);
    await updateDoc(doc(db, COLLECTIONS.users, uid), { fcmTokens: arrayRemove(token) });
    await deleteToken(messaging);
  } catch {}
}
