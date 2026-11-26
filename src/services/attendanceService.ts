// src/services/attendanceService.ts
// Presensi disimpan di koleksi attendances Firestore dengan id {sessionId}_{uid},
// sehingga satu praktikan hanya bisa punya satu presensi per sesi.
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { Attendance, AttendanceResult, COLLECTIONS, Lab, Session, User } from '../types';
import { Coordinate, distanceMeters, isWithinRadius } from '../utils/geo';
import { isLabUsable } from './labService';

export type Praktikan = { id: string; nama: string; nim: string };
export type Unsubscribe = () => void;

export const attendanceId = (sessionId: string, uid: string) => `${sessionId}_${uid}`;

type Snapshot = { docs: { id: string; data: () => unknown }[] };

function toAttendances(snapshot: Snapshot): Attendance[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Attendance, 'id'>) }));
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// Kesalahan aturan presensi yang sudah punya pesan sendiri di AttendanceAction.
class AttendanceRuleError extends Error {
  constructor(public reason: 'SESI_BELUM_DIBUKA' | 'SESI_DITUTUP' | 'SUDAH_PRESENSI') {
    super(reason);
  }
}
export async function submitAttendance(
  session: Session,
  user: Praktikan,
  catatan: string,
  lab: Lab | null,
  coords: Coordinate,
): Promise<AttendanceResult> {
  // Lokasi divalidasi SEBELUM menulis ke Firestore, jadi presensi di luar
  // radius atau tanpa lab acuan tidak pernah tercatat sebagai kehadiran berhasil.
  if (!lab || !isLabUsable(lab)) {
    return { ok: false, reason: 'LOKASI_TIDAK_VALID' };
  }
  const labCoord = { latitude: lab.latitude, longitude: lab.longitude };
  const jarak = distanceMeters(coords, labCoord);
  if (!isWithinRadius(coords, labCoord, lab.radius)) {
    return { ok: false, reason: 'LUAR_RADIUS' };
  }

  const id = attendanceId(session.id, user.id);
  const record: Attendance = {
    id,
    sessionId: session.id,
    praktikanId: user.id,
    nama: user.nama,
    nim: user.nim,
    waktu: new Date().toISOString(),
    catatan,
    jarakMeter: Math.round(jarak),
  };

  try {
   // Status sesi dan presensi sebelumnya diperiksa di server dalam satu transaksi,
    // jadi presensi ganda tetap tertolak walaupun tombol ditekan dua kali.
    await runTransaction(db, async (transaction) => {
      const sessionSnap = await transaction.get(doc(db, COLLECTIONS.sessions, session.id));
      const status = sessionSnap.exists() ? (sessionSnap.data() as Session).status : 'DITUTUP';
      if (status === 'BELUM_DIBUKA') throw new AttendanceRuleError('SESI_BELUM_DIBUKA');
      if (status === 'DITUTUP') throw new AttendanceRuleError('SESI_DITUTUP');

      const attendanceRef = doc(db, COLLECTIONS.attendances, id);
      const existing = await transaction.get(attendanceRef);
      if (existing.exists()) throw new AttendanceRuleError('SUDAH_PRESENSI');

      const { id: _id, ...data } = record;
      transaction.set(attendanceRef, data);
    });
    return { ok: true, record };
  } catch (error) {
    if (error instanceof AttendanceRuleError) return { ok: false, reason: error.reason };
    throw error;
  }
}

// Daftar hadir satu sesi untuk asisten, realtime (urut dari yang paling awal hadir).
export const subscribeAttendanceBySession = (
  sessionId: string,
  onData: (rows: Attendance[]) => void,
  onError: (e: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collection(db, COLLECTIONS.attendances), where('sessionId', '==', sessionId)),
    (snapshot) => onData(toAttendances(snapshot).sort((a, b) => a.waktu.localeCompare(b.waktu))),
    (error) => onError(toError(error)),
  );

// Semua presensi, khusus asisten (rules mengizinkan asisten membaca semua).
// Dipakai halaman Rekap Hadir untuk menghitung jumlah hadir per sesi.
export const subscribeAllAttendances = (
  onData: (rows: Attendance[]) => void,
  onError: (e: Error) => void,
): Unsubscribe =>
  onSnapshot(
    collection(db, COLLECTIONS.attendances),
    (snapshot) => onData(toAttendances(snapshot)),
    (error) => onError(toError(error)),
  );

// Riwayat presensi milik praktikan, realtime (terbaru di atas).
// Filter praktikanId wajib: rules menolak praktikan membaca presensi orang lain.
export const subscribeAttendanceByPraktikan = (
  uid: string,
  onData: (rows: Attendance[]) => void,
  onError: (e: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collection(db, COLLECTIONS.attendances), where('praktikanId', '==', uid)),
    (snapshot) => onData(toAttendances(snapshot).sort((a, b) => b.waktu.localeCompare(a.waktu))),
    (error) => onError(toError(error)),
  );

// Daftar praktikan yang terdaftar pada sesi, diambil dari profil di koleksi users.
export async function fetchRoster(session: Session): Promise<Praktikan[]> {
  const uids = session.enrolledStudents ?? [];
  const profiles = await Promise.all(
    uids.map(async (uid) => {
      const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
      if (!snapshot.exists()) return null;
      const data = snapshot.data() as Omit<User, 'id'>;
      return { id: snapshot.id, nama: data.nama, nim: data.nim };
    }),
  );
  return profiles
    .filter((p): p is Praktikan => p !== null)
    .sort((a, b) => a.nama.localeCompare(b.nama));
}
