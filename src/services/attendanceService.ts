// src/services/attendanceService.ts  (VERSI DUMMY, diganti di Fase B)
import { DUMMY_USERS, USER_ENROLLMENTS } from '../data/dummyData';
import { Attendance, AttendanceResult, Session } from '../types';

export type Praktikan = { id: string; nama: string; nim: string };
export type Unsubscribe = () => void;

export const attendanceId = (sessionId: string, uid: string) => `${sessionId}_${uid}`;

let store: Attendance[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export async function submitAttendance(
  session: Session,
  user: Praktikan,
  catatan: string,
): Promise<AttendanceResult> {
  if (session.status === 'BELUM_DIBUKA') return { ok: false, reason: 'SESI_BELUM_DIBUKA' };
  if (session.status === 'DITUTUP') return { ok: false, reason: 'SESI_DITUTUP' };

  const id = attendanceId(session.id, user.id);
  if (store.some(a => a.id === id)) return { ok: false, reason: 'SUDAH_PRESENSI' };

  const record: Attendance = {
    id,
    sessionId: session.id,
    praktikanId: user.id,
    nama: user.nama,
    nim: user.nim,
    waktu: new Date().toISOString(),
    catatan,
  };
  store = [...store, record];
  emit();
  return { ok: true, record };
}

function listen(
  filter: (a: Attendance) => boolean,
  sort: (a: Attendance, b: Attendance) => number,
  onData: (rows: Attendance[]) => void,
): Unsubscribe {
  const push = () => onData(store.filter(filter).sort(sort));
  listeners.add(push);
  push();
  return () => {
    listeners.delete(push);
  };
}

export const subscribeAttendanceBySession = (
  sessionId: string,
  onData: (rows: Attendance[]) => void,
  _onError: (e: Error) => void,
) =>
  listen(
    a => a.sessionId === sessionId,
    (a, b) => a.waktu.localeCompare(b.waktu),
    onData,
  );

export const subscribeAttendanceByPraktikan = (
  uid: string,
  onData: (rows: Attendance[]) => void,
  _onError: (e: Error) => void,
) =>
  listen(
    a => a.praktikanId === uid,
    (a, b) => b.waktu.localeCompare(a.waktu),
    onData,
  );

export async function fetchRoster(session: Session): Promise<Praktikan[]> {
  return DUMMY_USERS.filter(
    u => u.role === 'PRAKTIKAN' && USER_ENROLLMENTS[u.id]?.includes(session.id),
  ).map(({ id, nama, nim }) => ({ id, nama, nim }));
}
