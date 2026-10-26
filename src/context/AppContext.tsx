import React, { createContext, ReactNode, useContext, useState } from 'react';
import { DUMMY_SESSIONS, DUMMY_USERS } from '../data/dummyData';
import { Attendance, AttendanceResult, Role, Session, User } from '../types';

type AppContextType = {
  sessions: Session[];
  attendances: Attendance[];
  currentUser: User | null;
  role: Role | null;
  praktikanList: User[];
  asistenList: User[];
  setRole: (role: Role | null) => void;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  openSession: (id: string) => void;
  closeSession: (id: string) => void;
  markAttendance: (sessionId: string, catatan: string) => AttendanceResult;
  hasAttended: (sessionId: string, praktikanId: string) => boolean;
  getAttendanceBySession: (sessionId: string) => Attendance[];
  getAttendanceByPraktikan: (praktikanId: string) => Attendance[];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>(DUMMY_SESSIONS);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const praktikanList = DUMMY_USERS.filter((u: User) => u.role === 'PRAKTIKAN');
  const asistenList = DUMMY_USERS.filter((u: User) => u.role === 'ASISTEN');

  const logout = () => {
    setCurrentUser(null);
    setRole(null);
  };

  const openSession = (id: string) => {
    setSessions((prev: Session[]) => prev.map((s: Session) => 
      s.id === id ? { ...s, status: 'DIBUKA', dibukaPada: new Date().toISOString(), dibukaOleh: currentUser?.id || null } : s
    ));
  };

  const closeSession = (id: string) => {
    setSessions((prev: Session[]) => prev.map((s: Session) => 
      s.id === id ? { ...s, status: 'DITUTUP', ditutupPada: new Date().toISOString() } : s
    ));
  };

  const hasAttended = (sessionId: string, praktikanId: string) => {
    return attendances.some((a: Attendance) => a.sessionId === sessionId && a.praktikanId === praktikanId);
  };

  const markAttendance = (sessionId: string, catatan: string): AttendanceResult => {
    const session = sessions.find((s: Session) => s.id === sessionId);
    if (!session || session.status === 'BELUM_DIBUKA') return { ok: false, reason: 'SESI_BELUM_DIBUKA' };
    if (session.status === 'DITUTUP') return { ok: false, reason: 'SESI_DITUTUP' };
    if (!currentUser) return { ok: false, reason: 'SESI_DITUTUP' };
    if (hasAttended(sessionId, currentUser.id)) return { ok: false, reason: 'SUDAH_PRESENSI' };

    const record: Attendance = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId,
      praktikanId: currentUser.id,
      nama: currentUser.nama,
      nim: currentUser.nim,
      waktu: new Date().toISOString(),
      catatan
    };

    setAttendances((prev: Attendance[]) => [...prev, record]);
    return { ok: true, record };
  };

  const getAttendanceBySession = (sessionId: string) => {
    return attendances
      .filter((a: Attendance) => a.sessionId === sessionId)
      .sort((a: Attendance, b: Attendance) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
  };

  const getAttendanceByPraktikan = (praktikanId: string) => {
    return attendances
      .filter((a: Attendance) => a.praktikanId === praktikanId)
      .sort((a: Attendance, b: Attendance) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
  };

  return (
    <AppContext.Provider value={{
      sessions, attendances, currentUser, role, praktikanList, asistenList,
      setRole, setCurrentUser, logout, openSession, closeSession, markAttendance,
      hasAttended, getAttendanceBySession, getAttendanceByPraktikan
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};