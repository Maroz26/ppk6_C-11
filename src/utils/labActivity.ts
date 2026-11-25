// src/utils/labActivity.ts
// Menentukan praktikum yang sedang berlangsung dan berikutnya di sebuah lab
// dari data labSchedule. Fungsi murni (tanpa Firestore) supaya mudah dites.
import { Lab, LabScheduleEntry, SessionStatus } from '../types';

export type LabActivity = {
  current: LabScheduleEntry | null; // sedang berlangsung
  next: LabScheduleEntry | null;    // berikutnya
  occupied: boolean;
};

// "2026-11-24" + "08:00" -> Date waktu lokal. null kalau formatnya rusak.
export function toDateTime(tanggal: string, jam: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal);
  const t = /^(\d{2}):(\d{2})$/.exec(jam);
  if (!d || !t) return null;
  const date = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Jadwal milik lab ini: lewat labId, atau nama ruang yang sama (sesi lama).
export function entriesForLab(lab: Lab, entries: LabScheduleEntry[]): LabScheduleEntry[] {
  const nama = lab.nama.trim().toLowerCase();
  return entries.filter(
    (e) => e.labId === lab.id || (!e.labId && e.ruang.trim().toLowerCase() === nama),
  );
}

function startOf(e: LabScheduleEntry) {
  return toDateTime(e.tanggal, e.jamMulai);
}
function endOf(e: LabScheduleEntry) {
  return toDateTime(e.tanggal, e.jamSelesai);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getLabActivity(lab: Lab, entries: LabScheduleEntry[], now: Date): LabActivity {
  const mine = entriesForLab(lab, entries)
    .map((e) => ({ e, start: startOf(e), end: endOf(e) }))
    .filter((x): x is { e: LabScheduleEntry; start: Date; end: Date } => !!x.start && !!x.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Sedang berlangsung: sekarang di antara jam mulai dan selesai,
  // atau sesi hari ini yang sudah dibuka asisten (bisa dibuka lebih awal).
  const currentItem =
    mine.find((x) => x.start <= now && now < x.end) ??
    mine.find((x) => x.e.status === 'DIBUKA' && sameDay(x.start, now) && now < x.end) ??
    null;

  const nextItem =
    mine.find((x) => x.start > now && x.e.id !== currentItem?.e.id && x.e.status !== 'DITUTUP') ?? null;

  return {
    current: currentItem?.e ?? null,
    next: nextItem?.e ?? null,
    occupied: !!currentItem,
  };
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  BELUM_DIBUKA: 'Belum dibuka',
  DIBUKA: 'Dibuka',
  DITUTUP: 'Ditutup',
};

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

// "Hari ini, 08:00–10:00" / "Besok, ..." / "Rabu, 26 Nov, ..."
export function formatEntryTime(e: LabScheduleEntry, now: Date): string {
  const start = startOf(e);
  const jam = `${e.jamMulai}–${e.jamSelesai}`;
  if (!start) return jam;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(start, now)) return `Hari ini, ${jam}`;
  if (sameDay(start, tomorrow)) return `Besok, ${jam}`;
  return `${DAYS[start.getDay()]}, ${start.getDate()} ${MONTHS[start.getMonth()]}, ${jam}`;
}
