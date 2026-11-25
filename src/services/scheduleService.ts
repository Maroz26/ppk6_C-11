import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, Session, User } from '../types';

export type Unsubscribe = () => void;

// Data yang diisi asisten lewat form. Status dan pencatat buka/tutup diatur terpisah.
export type SessionInput = {
  praktikum: string;
  kelas: string;
  tanggal: string;      // YYYY-MM-DD
  jamMulai: string;     // HH:MM
  jamSelesai: string;   // HH:MM
  ruang: string;
  pertemuan: number;
  materi: string;
  enrolledStudents: string[]; // uid praktikan
  labId: string | null;        // dokumen di koleksi labs (acuan lokasi presensi)
};

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Mengembalikan pesan kesalahan, atau null kalau semua input valid.
export function validateSession(input: SessionInput): string | null {
  if (!input.praktikum.trim()) return 'Nama praktikum wajib diisi.';
  if (!input.kelas.trim()) return 'Kelas wajib diisi.';
  if (!TANGGAL.test(input.tanggal) || Number.isNaN(new Date(input.tanggal).getTime())) {
    return 'Tanggal harus berformat TTTT-BB-HH, misalnya 2026-11-20.';
  }
  if (!JAM.test(input.jamMulai) || !JAM.test(input.jamSelesai)) {
    return 'Jam harus berformat JJ:MM, misalnya 08:00.';
  }
  if (input.jamSelesai <= input.jamMulai) return 'Jam selesai harus setelah jam mulai.';
  if (!input.ruang.trim()) return 'Ruang wajib diisi.';
  if (!input.labId) return 'Pilih ruang dari daftar laboratorium agar lokasi presensi dapat diperiksa.';
  if (!Number.isInteger(input.pertemuan) || input.pertemuan < 1) {
    return 'Pertemuan harus berupa angka mulai dari 1.';
  }
  if (!input.materi.trim()) return 'Materi wajib diisi.';
  if (input.enrolledStudents.length === 0) return 'Pilih minimal satu praktikan.';
  return null;
}

function clean(input: SessionInput): SessionInput {
  return {
    praktikum: input.praktikum.trim(),
    kelas: input.kelas.trim(),
    tanggal: input.tanggal,
    jamMulai: input.jamMulai,
    jamSelesai: input.jamSelesai,
    ruang: input.ruang.trim(),
    pertemuan: input.pertemuan,
    materi: input.materi.trim(),
    enrolledStudents: input.enrolledStudents,
    labId: input.labId,
  };
}

function toSession(snapshot: { id: string; data: () => unknown }): Session {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Session, 'id'>) };
}

function byJadwal(a: Session, b: Session) {
  return `${a.tanggal} ${a.jamMulai}`.localeCompare(`${b.tanggal} ${b.jamMulai}`);
}

// Daftar sesi realtime. Asisten melihat semua sesi; praktikan hanya sesi yang ia ikuti.
export function listenSessionsForUser(
  user: Pick<User, 'id' | 'role'>,
  onData: (sessions: Session[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const sessionsRef = collection(db, COLLECTIONS.sessions);
  const source = user.role === 'ASISTEN'
    ? sessionsRef
    : query(sessionsRef, where('enrolledStudents', 'array-contains', user.id));

  return onSnapshot(
    source,
    (snapshot) => onData(snapshot.docs.map(toSession).sort(byJadwal)),
    (error) => onError?.(error),
  );
}

// Detail satu sesi realtime. Mengirim null kalau sesi sudah dihapus.
export function listenSessionById(
  sessionId: string,
  onData: (session: Session | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.sessions, sessionId),
    (snapshot) => onData(snapshot.exists() ? toSession(snapshot) : null),
    (error) => onError?.(error),
  );
}

// Daftar praktikan realtime, untuk dipilih asisten saat mengisi enrolledStudents.
export function listenPraktikanList(
  onData: (users: User[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COLLECTIONS.users), where('role', '==', 'PRAKTIKAN')),
    (snapshot) => onData(
      snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<User, 'id'>) }))
        .sort((a, b) => a.nama.localeCompare(b.nama)),
    ),
    (error) => onError?.(error),
  );
}

export async function createSession(input: SessionInput, asistenUid: string): Promise<string> {
  const created = await addDoc(collection(db, COLLECTIONS.sessions), {
    ...clean(input),
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null,
    dibuatOleh: asistenUid,
  });
  return created.id;
}

export async function updateSession(sessionId: string, input: SessionInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.sessions, sessionId), clean(input));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.sessions, sessionId));
}

// Mengubah kode error Firestore menjadi pesan yang bisa dibaca pengguna.
export function scheduleErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'firestore/permission-denied':
      return 'Akses ditolak. Kamu tidak berhak melakukan tindakan ini.';
    case 'firestore/unavailable':
      return 'Server tidak dapat dihubungi. Periksa koneksi internet.';
    case 'firestore/not-found':
      return 'Sesi tidak ditemukan. Mungkin sudah dihapus.';
    default:
      return 'Terjadi kesalahan saat mengakses data jadwal. Coba lagi.';
  }
}