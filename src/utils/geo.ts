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

// Membaca koordinat dari teks yang ditempel pengguna. Bisa berupa:
// - pasangan angka: "-7.0482269, 110.4408514"
// - link Google Maps panjang: "...?q=-7.04,110.44", "!3d-7.04!4d110.44" (titik pin, diutamakan),
//   atau ".../@-7.04,110.44,19z" (titik tengah layar peta)
// Link pendek (maps.app.goo.gl) tidak berisi angka koordinat, jadi tidak bisa dibaca.
export function parseCoordinateText(text: string): Coordinate | null {
  const patterns = [
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/,
    /[?&](?:q|query|ll)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  const decoded = (() => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  })();
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const coordinate = { latitude: Number(match[1]), longitude: Number(match[2]) };
      if (isValidCoordinate(coordinate)) return coordinate;
    }
  }
  return null;
}

// Poligon lingkaran (GeoJSON [lng, lat]) berjari-jari radiusMeter di sekitar center.
// Dipakai untuk menggambar radius presensi lab di peta.
export function circlePolygon(center: Coordinate, radiusMeter: number, steps = 48): [number, number][] {
  const points: [number, number][] = [];
  const latRad = toRad(center.latitude);
  const dLat = (radiusMeter / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(latRad), 1e-6);
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    points.push([center.longitude + dLng * Math.cos(angle), center.latitude + dLat * Math.sin(angle)]);
  }
  return points;
}
