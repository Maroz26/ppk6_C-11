// src/utils/geo.ts
// Fungsi bantu lokasi yang dipakai bersama:
// - Programmer 1: validasi radius saat presensi
// - Programmer 2: jarak pengguna ke laboratorium di halaman peta

export type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Koordinat valid kalau berupa angka dan berada di rentang lintang/bujur bumi.
export function isValidCoordinate(c: Partial<Coordinate> | null | undefined): c is Coordinate {
  return (
    !!c &&
    typeof c.latitude === 'number' &&
    typeof c.longitude === 'number' &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    c.longitude >= -180 &&
    c.longitude <= 180
  );
}

// Jarak dua titik di permukaan bumi (rumus haversine), hasil dalam meter.
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// true kalau titik pengguna berada di dalam radius (meter) dari titik pusat.
export function isWithinRadius(user: Coordinate, center: Coordinate, radiusMeter: number): boolean {
  return distanceMeters(user, center) <= radiusMeter;
}

// "35 m" atau "1,2 km" untuk ditampilkan di antarmuka.
export function formatDistance(meter: number): string {
  if (!Number.isFinite(meter)) return '-';
  if (meter < 1000) return `${Math.round(meter)} m`;
  return `${(meter / 1000).toFixed(1).replace('.', ',')} km`;
}