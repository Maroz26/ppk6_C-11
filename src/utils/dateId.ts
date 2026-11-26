// src/utils/dateId.ts
// Format tanggal berbahasa Indonesia untuk tampilan (tanpa bergantung locale perangkat).
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
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

// "November 2026"
export function namaBulanTahun(date: Date) {
  return `${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

// Date -> "2026-11-23" (format field tanggal di Firestore).
export function toIsoDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

// Tanggal-tanggal yang tampil di kalender bulanan, minggu dimulai hari Senin.
// Termasuk tanggal bulan sebelum/sesudah untuk mengisi baris pertama dan terakhir.
export function calendarWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Senin = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const weeks: Date[][] = [];
  for (let r = 0; r < rows; r++) {
    const week: Date[] = [];
    for (let c = 0; c < 7; c++) {
      week.push(new Date(month.getFullYear(), month.getMonth(), 1 - offset + r * 7 + c));
    }
    weeks.push(week);
  }
  return weeks;
}

// "Baru saja" / "5 menit lalu" / "3 jam lalu" / "Kemarin" / "4 hari lalu" / "23 Nov"
// Untuk waktu di masa depan: "Dalam 2 jam" / "Besok 08:00".
export function waktuRelatif(date: Date, now = new Date()) {
  const diff = now.getTime() - date.getTime();
  const menit = Math.round(Math.abs(diff) / 60000);
  const jam = Math.round(menit / 60);
  if (diff < 0) {
    if (menit < 60) return `Dalam ${Math.max(menit, 1)} menit`;
    if (isSameDay(date, now)) return `Dalam ${jam} jam`;
    const hh = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${labelHari(date, now)} ${hh}`;
  }
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  if (isSameDay(date, now)) return `${jam} jam lalu`;
  const kemarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameDay(date, kemarin)) return 'Kemarin';
  const hari = Math.floor(diff / 86400000);
  if (hari < 7) return `${hari} hari lalu`;
  return tanggalPendek(date);
}
