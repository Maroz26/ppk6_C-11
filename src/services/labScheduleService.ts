// src/services/labScheduleService.ts
// Koleksi "labSchedule": salinan jadwal sesi per laboratorium yang aman dibaca
// semua pengguna (tanpa enrolledStudents). Dipakai halaman peta untuk menampilkan
// praktikum yang sedang berlangsung dan berikutnya di setiap lab.
import {
    collection,
    doc,
    onSnapshot,
    writeBatch,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, LabScheduleEntry, Session, SessionStatus } from '../types';

export type Unsubscribe = () => void;

type EntryData = Omit<LabScheduleEntry, 'id'>;

// Mengambil field yang boleh dipublikasikan dari sebuah sesi.
export function toScheduleData(session: Session): EntryData {
  return {
    labId: session.labId ?? null,
    ruang: session.ruang ?? '',
    praktikum: session.praktikum ?? '',
    kelas: session.kelas ?? '',
    pertemuan: Number(session.pertemuan) || 0,
    tanggal: session.tanggal ?? '',
    jamMulai: session.jamMulai ?? '',
    jamSelesai: session.jamSelesai ?? '',
    status: session.status,
  };
}

function sameData(a: EntryData, b: EntryData): boolean {
  return (
    a.labId === b.labId &&
    a.ruang === b.ruang &&
    a.praktikum === b.praktikum &&
    a.kelas === b.kelas &&
    a.pertemuan === b.pertemuan &&
    a.tanggal === b.tanggal &&
    a.jamMulai === b.jamMulai &&
    a.jamSelesai === b.jamSelesai &&
    a.status === b.status
  );
}

const asText = (v: unknown) => (v == null ? '' : String(v));
const STATUSES: SessionStatus[] = ['BELUM_DIBUKA', 'DIBUKA', 'DITUTUP'];

function toEntry(snapshot: { id: string; data: () => unknown }): LabScheduleEntry {
  const d = (snapshot.data() ?? {}) as Record<string, unknown>;
  const status = STATUSES.includes(d.status as SessionStatus) ? (d.status as SessionStatus) : 'BELUM_DIBUKA';
  return {
    id: snapshot.id,
    labId: d.labId ? asText(d.labId) : null,
    ruang: asText(d.ruang),
    praktikum: asText(d.praktikum),
    kelas: asText(d.kelas),
    pertemuan: Number(d.pertemuan) || 0,
    tanggal: asText(d.tanggal),
    jamMulai: asText(d.jamMulai),
    jamSelesai: asText(d.jamSelesai),
    status,
  };
}

// Semua jadwal lab realtime. Bisa dibaca semua pengguna yang login.
export function listenLabSchedule(
  onData: (entries: LabScheduleEntry[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.labSchedule),
    (snapshot) => onData(snapshot.docs.map(toEntry)),
    (error) => onError?.(error),
  );
}

// Menyamakan labSchedule dengan daftar sesi (hanya dijalankan di perangkat asisten).
// Menulis sesi yang baru/berubah dan menghapus salinan sesi yang sudah dihapus.
// Mengembalikan jumlah dokumen yang diubah.
export async function syncLabSchedule(
  sessions: Session[],
  current: LabScheduleEntry[],
): Promise<number> {
  const existing = new Map(current.map((e) => [e.id, e]));
  const sessionIds = new Set(sessions.map((s) => s.id));
  const ops: { type: 'set' | 'delete'; id: string; data?: EntryData }[] = [];

  sessions.forEach((session) => {
    const data = toScheduleData(session);
    const old = existing.get(session.id);
    if (!old || !sameData(old, data)) ops.push({ type: 'set', id: session.id, data });
  });
  current.forEach((entry) => {
    if (!sessionIds.has(entry.id)) ops.push({ type: 'delete', id: entry.id });
  });

  // Batas satu batch Firestore 500 operasi.
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => {
      const ref = doc(db, COLLECTIONS.labSchedule, op.id);
      if (op.type === 'set' && op.data) batch.set(ref, op.data);
      else batch.delete(ref);
    });
    await batch.commit();
  }
  return ops.length;
}