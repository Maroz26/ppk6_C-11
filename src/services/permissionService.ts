// src/services/permissionService.ts
// Pengajuan izin disimpan di koleksi permissions Firestore.
// Praktikan membuat dengan status MENUNGGU; asisten hanya mengubah
// status, diputuskanOleh, dan diputuskanPada (dijaga oleh firestore.rules).
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, Session } from '../types';

export type PermissionStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

export type PermissionRecord = {
  id: string;
  sessionId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  alasan: string;
  status: PermissionStatus;
  diajukanPada: string;
  diputuskanOleh: string | null;
  diputuskanPada: string | null;
};

export type CreatePermissionInput = Pick<
  PermissionRecord,
  'sessionId' | 'praktikanId' | 'nama' | 'nim' | 'alasan'
>;

type PermissionListener = (permissions: PermissionRecord[]) => void;
type ErrorListener = (error: Error) => void;
type SessionWithCreator = Pick<Session, 'id' | 'dibuatOleh'>;
type Snapshot = { docs: { id: string; data: () => unknown }[] };

function toPermissions(snapshot: Snapshot): PermissionRecord[] {
  return snapshot.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<PermissionRecord, 'id'>) }))
    // Terbaru di atas; diurutkan di aplikasi supaya tidak butuh indeks gabungan Firestore.
    .sort((a, b) => b.diajukanPada.localeCompare(a.diajukanPada));
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export const createPermission = async (input: CreatePermissionInput): Promise<PermissionRecord> => {
  const alasan = input.alasan.trim();
  if (!alasan) throw new Error('Alasan izin wajib diisi.');
  if (!input.sessionId || !input.praktikanId) {
    throw new Error('Sesi dan identitas praktikan wajib tersedia.');
  }

  const data = {
    sessionId: input.sessionId,
    praktikanId: input.praktikanId,
    nama: input.nama,
    nim: input.nim,
    alasan,
    status: 'MENUNGGU' as PermissionStatus,
    diajukanPada: new Date().toISOString(),
    diputuskanOleh: null,
    diputuskanPada: null,
  };
  const created = await addDoc(collection(db, COLLECTIONS.permissions), data);
  return { id: created.id, ...data };
};

// Izin milik satu praktikan. Filter praktikanId wajib karena rules menolak list tanpa filter.
export const listenPermissionsByPraktikan = (
  praktikanId: string,
  listener: PermissionListener,
  onError?: ErrorListener,
) =>
  onSnapshot(
    query(collection(db, COLLECTIONS.permissions), where('praktikanId', '==', praktikanId)),
    snapshot => listener(toPermissions(snapshot)),
    error => onError?.(toError(error)),
  );

// Izin untuk asisten: hanya yang sesinya dibuat asisten ini.
// Rules mengizinkan asisten membaca semua izin, penyaringan sesi dilakukan di aplikasi.
export const listenPermissionsForAssistant = (
  assistantId: string,
  sessions: readonly SessionWithCreator[],
  listener: PermissionListener,
  onError?: ErrorListener,
) => {
  const ownedSessionIds = new Set(
    sessions.filter(session => session.dibuatOleh === assistantId).map(session => session.id),
  );
  return onSnapshot(
    collection(db, COLLECTIONS.permissions),
    snapshot =>
      listener(toPermissions(snapshot).filter(permission => ownedSessionIds.has(permission.sessionId))),
    error => onError?.(toError(error)),
  );
};

export const decidePermission = async (
  permissionId: string,
  status: Extract<PermissionStatus, 'DITERIMA' | 'DITOLAK'>,
  assistantId: string,
) => {
  if (!assistantId.trim()) throw new Error('Identitas asisten tidak tersedia.');

  const ref = doc(db, COLLECTIONS.permissions, permissionId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Pengajuan izin tidak ditemukan.');
  if ((snapshot.data() as { status?: PermissionStatus }).status !== 'MENUNGGU') {
    throw new Error('Pengajuan izin ini sudah diputuskan.');
  }

  // Hanya tiga field ini yang boleh berubah menurut firestore.rules.
  await updateDoc(ref, {
    status,
    diputuskanOleh: assistantId,
    diputuskanPada: new Date().toISOString(),
  });
};