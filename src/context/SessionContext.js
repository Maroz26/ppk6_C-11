import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { INITIAL_SESSIONS, STATUS } from '../data/sessions';

/**
 * @typedef {object} Session
 * @property {string} id
 * @property {string} namaPrak
 * @property {string} kelas
 * @property {string} tanggal
 * @property {string} jam
 * @property {string} ruang
 * @property {string} status
 * @property {string | null} dibuka_saat
 * @property {string | null} ditutup_saat
 * @property {unknown[]} attendance
 */

/**
 * @typedef {object} SessionContextValue
 * @property {Session[]} sessions
 * @property {(sessionId: string) => void} openSession
 * @property {(sessionId: string) => void} closeSession
 * @property {(sessionId: string, record: unknown) => void} addAttendance
 * @property {(id: string) => Session | null} getSessionById
 */

const SessionContext = createContext(/** @type {SessionContextValue | null} */ (null));

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  // Buka sesi: hanya kalau masih BELUM
  const openSession = useCallback((sessionId) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId && s.status === STATUS.BELUM
          ? { ...s, status: STATUS.DIBUKA, dibuka_saat: new Date().toISOString() }
          : s
      )
    );
  }, []);

  // Tutup sesi: hanya kalau sedang DIBUKA
  const closeSession = useCallback((sessionId) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId && s.status === STATUS.DIBUKA
          ? { ...s, status: STATUS.DITUTUP, ditutup_saat: new Date().toISOString() }
          : s
      )
    );
  }, []);

  // Dipakai P3 untuk mencatat presensi
  const addAttendance = useCallback((sessionId, record) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, attendance: [...s.attendance, record] }
          : s
      )
    );
  }, []);

  const getSessionById = useCallback(
    (id) => sessions.find((s) => s.id === id) || null,
    [sessions]
  );

  const value = useMemo(
    () => ({ sessions, openSession, closeSession, addAttendance, getSessionById }),
    [sessions, openSession, closeSession, addAttendance, getSessionById]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessions dipakai di luar SessionProvider');
  return ctx;
}