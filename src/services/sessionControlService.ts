import { DUMMY_SESSIONS } from '../data/dummyData';
import { Session, SessionStatus } from '../types';

type SessionListener = (session: Session | null) => void;
type SessionsListener = (sessions: Session[]) => void;

let sessions = DUMMY_SESSIONS.map(session => ({ ...session }));
const listeners = new Set<SessionsListener>();

const publish = () => {
  const snapshot = sessions.map(session => ({ ...session }));
  listeners.forEach(listener => listener(snapshot));
}

export const listenSessions = (listener: SessionsListener) => {
  listeners.add(listener);
  listener(sessions.map(session => ({ ...session })));
  return () => {
    listeners.delete(listener);
  };
};

export const listenSessionById = (sessionId: string, listener: SessionListener) => {
  const notify = (snapshot: Session[]) => {
    listener(snapshot.find(session => session.id === sessionId) ?? null);
  };
  listeners.add(notify);
  notify(sessions);
  return () => {
    listeners.delete(notify);
  };
};

export const setSessionStatus = async (
  sessionId: string,
  status: Extract<SessionStatus, 'DIBUKA' | 'DITUTUP'>,
  actorUid: string
) => {
  const index = sessions.findIndex(session => session.id === sessionId);
  if (index < 0) throw new Error('Sesi tidak ditemukan.');
  if (!actorUid.trim()) throw new Error('Identitas asisten tidak tersedia.');

  const session = sessions[index];
  if (status === 'DIBUKA' && session.status !== 'BELUM_DIBUKA') {
    throw new Error('Sesi hanya dapat dibuka dari status Belum Dibuka.');
  }
  if (status === 'DITUTUP' && session.status !== 'DIBUKA') {
    throw new Error('Sesi hanya dapat ditutup saat sedang dibuka.');
  }

  const now = new Date().toISOString();
  sessions = sessions.map((item, itemIndex) =>
    itemIndex !== index
      ? item
      : status === 'DIBUKA'
        ? { ...item, status, dibukaPada: now, dibukaOleh: actorUid }
        : { ...item, status, ditutupPada: now }
  );
  publish();
};
