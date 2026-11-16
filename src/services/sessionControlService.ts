// src/services/sessionControlService.ts
// Buka/tutup sesi langsung ke Firestore (koleksi sessions).
// Daftar sesi dan detail realtime ada di scheduleService
// (listenSessionsForUser, listenSessionById) dan AppContext.
import { doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, Session, SessionStatus } from '../types';

export const setSessionStatus = async (
  sessionId: string,
  status: Extract<SessionStatus, 'DIBUKA' | 'DITUTUP'>,
  actorUid: string,
) => {
  if (!actorUid.trim()) throw new Error('Identitas asisten tidak tersedia.');

  const ref = doc(db, COLLECTIONS.sessions, sessionId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Sesi tidak ditemukan.');

  const current = (snapshot.data() as Pick<Session, 'status'>).status;
  if (status === 'DIBUKA' && current !== 'BELUM_DIBUKA') {
    throw new Error('Sesi hanya dapat dibuka dari status Belum Dibuka.');
  }
  if (status === 'DITUTUP' && current !== 'DIBUKA') {
    throw new Error('Sesi hanya dapat ditutup saat sedang dibuka.');
  }

  const now = new Date().toISOString();
  await updateDoc(
    ref,
    status === 'DIBUKA'
      ? { status, dibukaPada: now, dibukaOleh: actorUid }
      : { status, ditutupPada: now },
  );
};