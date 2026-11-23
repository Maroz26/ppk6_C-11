// src/services/labService.ts
// Data laboratorium (lokasi, koordinat, radius) di koleksi Firestore "labs".
// Dipakai halaman peta (Programmer 2), validasi presensi (Programmer 1),
// dan form jadwal saat asisten memilih ruang.
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, Lab, Session } from '../types';
import { isValidCoordinate } from '../utils/geo';

export type Unsubscribe = () => void;

// Data yang diisi asisten. Pencatat perubahan diisi otomatis oleh service.
export type LabInput = {
  nama: string;
  gedung: string;
  deskripsi: string;
  latitude: number;
  longitude: number;
  radius: number; // meter
};

// Batas radius yang diizinkan. Harus sama dengan firestore.rules.
export const RADIUS_MIN = 10;
export const RADIUS_MAX = 500;
export const RADIUS_DEFAULT = 50;

// Mengembalikan pesan kesalahan, atau null kalau semua input valid.
export function validateLab(input: LabInput): string | null {
  if (!input.nama.trim()) return 'Nama laboratorium wajib diisi.';
  if (!input.gedung.trim()) return 'Gedung wajib diisi.';
  if (!isValidCoordinate({ latitude: input.latitude, longitude: input.longitude })) {
    return 'Koordinat tidak valid. Lintang -90 s.d. 90, bujur -180 s.d. 180.';
  }
  if (!Number.isFinite(input.radius) || input.radius < RADIUS_MIN || input.radius > RADIUS_MAX) {
    return `Radius harus antara ${RADIUS_MIN} dan ${RADIUS_MAX} meter.`;
  }
  return null;
}

function clean(input: LabInput) {
  return {
    nama: input.nama.trim(),
    gedung: input.gedung.trim(),
    deskripsi: input.deskripsi.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    radius: Math.round(input.radius),
  };
}

function toLab(snapshot: { id: string; data: () => unknown }): Lab {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Lab, 'id'>) };
}

// Semua laboratorium realtime, urut nama. Bisa dibaca semua pengguna yang login.
export function listenLabs(
  onData: (labs: Lab[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.labs),
    (snapshot) => onData(
      snapshot.docs.map(toLab).sort((a, b) => a.nama.localeCompare(b.nama)),
    ),
    (error) => onError?.(error),
  );
}

// Satu laboratorium realtime. Mengirim null kalau sudah dihapus.
export function listenLabById(
  labId: string,
  onData: (lab: Lab | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.labs, labId),
    (snapshot) => onData(snapshot.exists() ? toLab(snapshot) : null),
    (error) => onError?.(error),
  );
}

// Ambil satu laboratorium sekali baca (dipakai saat validasi presensi).
export async function getLabById(labId: string): Promise<Lab | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.labs, labId));
  return snapshot.exists() ? toLab(snapshot) : null;
}

// Mencari laboratorium sebuah sesi. Sesi baru memakai labId;
// sesi lama (sprint 2) belum punya labId sehingga dicocokkan lewat nama ruang.
export function findLabForSession(
  session: Pick<Session, 'labId' | 'ruang'>,
  labs: Lab[],
): Lab | undefined {
  if (session.labId) {
    const byId = labs.find((lab) => lab.id === session.labId);
    if (byId) return byId;
  }
  const ruang = session.ruang.trim().toLowerCase();
  return labs.find((lab) => lab.nama.trim().toLowerCase() === ruang);
}

export async function createLab(input: LabInput, asistenUid: string): Promise<string> {
  const created = await addDoc(collection(db, COLLECTIONS.labs), {
    ...clean(input),
    diperbaruiOleh: asistenUid,
    diperbaruiPada: new Date().toISOString(),
  });
  return created.id;
}

export async function updateLab(labId: string, input: LabInput, asistenUid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.labs, labId), {
    ...clean(input),
    diperbaruiOleh: asistenUid,
    diperbaruiPada: new Date().toISOString(),
  });
}

export async function deleteLab(labId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.labs, labId));
}

// Mengubah kode error Firestore menjadi pesan yang bisa dibaca pengguna.
export function labErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'firestore/permission-denied':
      return 'Akses ditolak. Hanya asisten yang dapat mengubah data laboratorium.';
    case 'firestore/unavailable':
      return 'Server tidak dapat dihubungi. Periksa koneksi internet.';
    case 'firestore/not-found':
      return 'Laboratorium tidak ditemukan. Mungkin sudah dihapus.';
    default:
      return 'Terjadi kesalahan saat mengakses data laboratorium. Coba lagi.';
  }
}