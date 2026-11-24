// src/services/locationService.ts
// Minta izin lokasi dan ambil koordinat perangkat untuk validasi presensi.
import * as Location from 'expo-location';

export type LocationStatus =
  | { status: 'OK'; coords: { latitude: number; longitude: number } }
  | { status: 'IZIN_DITOLAK' }
  | { status: 'GPS_MATI' }
  | { status: 'GAGAL_DIDAPAT' };

export async function getCurrentCoords(): Promise<LocationStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { status: 'IZIN_DITOLAK' };

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return { status: 'GPS_MATI' };

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      status: 'OK',
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    // Timeout, sinyal GPS tidak tertangkap, atau error perangkat lain.
    return { status: 'GAGAL_DIDAPAT' };
  }
}

export const LOCATION_ERROR_MESSAGES: Record<Exclude<LocationStatus['status'], 'OK'>, string> = {
  IZIN_DITOLAK: 'Izin lokasi ditolak. Aktifkan izin lokasi untuk ASSIST di pengaturan perangkat.',
  GPS_MATI: 'Layanan lokasi (GPS) perangkat sedang mati. Aktifkan lalu coba lagi.',
  GAGAL_DIDAPAT: 'Lokasi tidak dapat diperoleh. Periksa sinyal GPS atau koneksi lalu coba lagi.',
};
