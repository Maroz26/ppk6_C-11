import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// Konfigurasi proyek (API key, project id) dibaca otomatis dari
// google-services.json saat build, jadi tidak perlu ditulis di sini.
// Semua service mengimpor auth dan db dari file ini.
export const auth = getAuth();
export const db = getFirestore();