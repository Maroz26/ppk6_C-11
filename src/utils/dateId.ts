// src/utils/dateId.ts
// Format tanggal berbahasa Indonesia untuk tampilan (tanpa bergantung locale perangkat).
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function namaHari(date: Date) {
  return HARI[date.getDay()];
}

// "23 Nov"
export function tanggalPendek(date: Date) {
  return `${date.getDate()} ${BULAN_PENDEK[date.getMonth()]}`;
}

// "2026-11-23" + "08:00" -> Date waktu lokal (null kalau formatnya rusak).
export function toLocalDate(tanggal: string, jam = '00:00'): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal ?? '');
  const t = /^(\d{2}):(\d{2})$/.exec(jam ?? '');
  if (!d || !t) return null;
  return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Hari ini" / "Besok" / "Rabu, 26 Nov"
export function labelHari(date: Date, now = new Date()) {
  const besok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameDay(date, now)) return 'Hari ini';
  if (isSameDay(date, besok)) return 'Besok';
  return `${namaHari(date)}, ${tanggalPendek(date)}`;
}
