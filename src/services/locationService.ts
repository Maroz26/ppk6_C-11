// src/services/locationService.ts
// Izin lokasi dan pengambilan koordinat perangkat (expo-location).
// Semua kondisi gagal dikembalikan sebagai "reason" supaya layar bisa
// menampilkan pesan yang jelas. Bisa dipakai juga oleh halaman presensi.
import type * as LocationModule from 'expo-location';
import { Linking, Platform } from 'react-native';
import { Coordinate } from '../utils/geo';

// expo-location dimuat saat dipakai, bukan saat aplikasi dibuka. Kalau dev build
// yang terpasang belum berisi modul native-nya, hanya fitur lokasi yang gagal
// (dengan pesan TIDAK_DIDUKUNG), bukan seluruh aplikasi.
let cachedLocation: typeof LocationModule | null | undefined;
function loadLocation(): typeof LocationModule | null {
  if (cachedLocation !== undefined) return cachedLocation;
  try {
    cachedLocation = require('expo-location') as typeof LocationModule;
  } catch {
    cachedLocation = null;
  }
  return cachedLocation;
}

export function isLocationSupported(): boolean {
  return loadLocation() !== null;
}

export type LocationFailReason =
  | 'TIDAK_DIDUKUNG'        // dev build belum berisi expo-location, perlu pasang build terbaru
  | 'IZIN_DITOLAK'          // pengguna menolak, masih bisa diminta lagi
  | 'IZIN_DITOLAK_PERMANEN' // ditolak dan tidak bisa diminta lagi, harus lewat Pengaturan
  | 'GPS_MATI'              // layanan lokasi perangkat tidak aktif
  | 'TIMEOUT'               // lokasi belum didapat dalam batas waktu
  | 'GAGAL';                // kesalahan lain

export type DeviceLocation = Coordinate & {
  accuracy: number | null; // meter, makin kecil makin akurat
  timestamp: number;
};

export type LocationResult =
  | { ok: true; location: DeviceLocation }
  | { ok: false; reason: LocationFailReason };

export type PermissionResult =
  | { ok: true }
  | { ok: false; reason: 'TIDAK_DIDUKUNG' | 'IZIN_DITOLAK' | 'IZIN_DITOLAK_PERMANEN' | 'GPS_MATI' };

const TIMEOUT_MS = 15000;

export function toDeviceLocation(position: LocationModule.LocationObject): DeviceLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp,
  };
}

// Meminta izin lokasi (kalau belum) lalu memastikan GPS aktif.
export async function ensureLocationPermission(): Promise<PermissionResult> {
  const Location = loadLocation();
  if (!Location) return { ok: false, reason: 'TIDAK_DIDUKUNG' };
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (!permission.granted) {
    return { ok: false, reason: permission.canAskAgain ? 'IZIN_DITOLAK' : 'IZIN_DITOLAK_PERMANEN' };
  }
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) return { ok: false, reason: 'GPS_MATI' };
  return { ok: true };
}

// Mengambil satu titik lokasi terkini dengan batas waktu.
export async function getCurrentLocation(): Promise<LocationResult> {
  const Location = loadLocation();
  if (!Location) return { ok: false, reason: 'TIDAK_DIDUKUNG' };
  try {
    const permission = await ensureLocationPermission();
    if (!permission.ok) return permission;

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeout,
    ]);
    if (!position) return { ok: false, reason: 'TIMEOUT' };
    return { ok: true, location: toDeviceLocation(position) };
  } catch {
    // Di Android, error ini juga muncul kalau GPS dimatikan saat sedang mencari lokasi.
    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
    return { ok: false, reason: servicesOn ? 'GAGAL' : 'GPS_MATI' };
  }
}

// Memantau posisi perangkat terus-menerus (dipakai halaman peta).
// Mengembalikan fungsi untuk berhenti memantau.
export async function watchLocation(
  onUpdate: (location: DeviceLocation) => void,
  onFail: (reason: LocationFailReason) => void,
): Promise<() => void> {
  const Location = loadLocation();
  if (!Location) {
    onFail('TIDAK_DIDUKUNG');
    return () => {};
  }
  try {
    const permission = await ensureLocationPermission();
    if (!permission.ok) {
      onFail(permission.reason);
      return () => {};
    }
    // Tampilkan posisi terakhir yang diketahui dulu supaya titik cepat muncul.
    Location.getLastKnownPositionAsync()
      .then((last) => last && onUpdate(toDeviceLocation(last)))
      .catch(() => {});

    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
      (position) => onUpdate(toDeviceLocation(position)),
      () => {
        Location.hasServicesEnabledAsync()
          .then((on) => onFail(on ? 'GAGAL' : 'GPS_MATI'))
          .catch(() => onFail('GAGAL'));
      },
    );
    return () => subscription.remove();
  } catch {
    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
    onFail(servicesOn ? 'GAGAL' : 'GPS_MATI');
    return () => {};
  }
}

export function locationErrorMessage(reason: LocationFailReason): string {
  switch (reason) {
    case 'TIDAK_DIDUKUNG':
      return 'Versi aplikasi ini belum mendukung lokasi. Pasang dev build terbaru.';
    case 'IZIN_DITOLAK':
      return 'Izin lokasi ditolak. Izinkan akses lokasi agar posisimu dapat diperiksa.';
    case 'IZIN_DITOLAK_PERMANEN':
      return 'Izin lokasi diblokir. Buka Pengaturan aplikasi lalu izinkan akses lokasi.';
    case 'GPS_MATI':
      return 'Layanan lokasi (GPS) di perangkat sedang mati. Aktifkan lalu coba lagi.';
    case 'TIMEOUT':
      return 'Lokasi belum didapat. Pindah ke area terbuka atau dekat jendela, lalu coba lagi.';
    default:
      return 'Lokasi tidak dapat diperoleh. Coba lagi beberapa saat.';
  }
}

// Tindak lanjut yang bisa ditawarkan ke pengguna sesuai penyebab gagal.
export async function resolveLocationProblem(reason: LocationFailReason): Promise<void> {
  if (reason === 'IZIN_DITOLAK_PERMANEN') {
    await Linking.openSettings();
    return;
  }
  const Location = loadLocation();
  if (Location && reason === 'GPS_MATI' && Platform.OS === 'android') {
    // Menampilkan dialog sistem "Aktifkan lokasi?" di Android.
    await Location.enableNetworkProviderAsync().catch(() => {});
  }
}

export function resolveActionLabel(reason: LocationFailReason): string | null {
  if (reason === 'IZIN_DITOLAK_PERMANEN') return 'Buka Pengaturan';
  if (reason === 'GPS_MATI' && Platform.OS === 'android') return 'Aktifkan GPS';
  if (reason === 'IZIN_DITOLAK' || reason === 'TIMEOUT' || reason === 'GAGAL') return 'Coba lagi';
  return null;
}
