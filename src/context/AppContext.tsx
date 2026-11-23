import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { logoutUser } from '../services/authService';
import { unregisterPushToken } from '../services/notificationService';
import {
  listenPraktikanList,
  listenSessionsForUser,
  scheduleErrorMessage,
} from '../services/scheduleService';
import { Attendance, AttendanceResult, COLLECTIONS, Role, Session, User } from '../types';

type AppContextType = {
  sessions: Session[];
  sessionsError: string;
  attendances: Attendance[];
  currentUser: User | null;
  role: Role | null;
  authReady: boolean;
  isLoggedIn: boolean;
  profileReady: boolean;
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsError, setSessionsError] = useState('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [praktikanList, setPraktikanList] = useState<User[]>([]);

  // Halaman pilih identitas sudah tidak dipakai, jadi daftar asisten dikosongkan.
  const asistenList: User[] = [];

  // Sumber identitas: Firebase Authentication. Profil dan peran dibaca realtime dari users/{uid}.
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      if (!firebaseUser) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setRole(null);
        setProfileReady(false);
        setAuthReady(true);
        return;
      }

      setIsLoggedIn(true);
      setAuthReady(true);
      unsubscribeProfile = onSnapshot(
        doc(db, COLLECTIONS.users, firebaseUser.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Omit<User, 'id'>;
            setCurrentUser({ id: snapshot.id, ...data });
            setRole(data.role);
          } else {
            setCurrentUser(null);
            setRole(null);
          }
          setProfileReady(true);
        },
        () => {
          // Profil gagal dibaca (misalnya ditolak rules atau tanpa koneksi).
          setCurrentUser(null);
          setRole(null);
          setProfileReady(true);
        },
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const userId = currentUser?.id;
  const userRole = currentUser?.role;

  // Daftar sesi realtime dari Firestore, tersaring sesuai peran pengguna.
  useEffect(() => {
    if (!userId || !userRole) {
      setSessions([]);
      setSessionsError('');
      return;
    }
    return listenSessionsForUser(
      { id: userId, role: userRole },
      (data) => {
        setSessions(data);
        setSessionsError('');
      },
      (error) => {
        setSessions([]);
        setSessionsError(scheduleErrorMessage(error));
      },
    );
  }, [userId, userRole]);

  // Daftar praktikan realtime dari koleksi users. Hanya asisten yang diizinkan rules.
  useEffect(() => {
    if (!userId || userRole !== 'ASISTEN') {
      setPraktikanList([]);
      return;
    }
    return listenPraktikanList(setPraktikanList, () => setPraktikanList([]));
  }, [userId, userRole]);

  const logout = () => {
    const uid = currentUser?.id;
    setCurrentUser(null);
    setRole(null);
    setProfileReady(false);
    // Hapus token perangkat dulu (butuh user masih login), baru signOut.
    (uid ? unregisterPushToken(uid) : Promise.resolve())
      .catch(() => {})
      .finally(() => logoutUser().catch(() => {}));
  };

  const openSession = (id: string) => {
    updateDoc(doc(db, COLLECTIONS.sessions, id), {
      status: 'DIBUKA',
      dibukaPada: new Date().toISOString(),
      dibukaOleh: currentUser?.id ?? null,
    }).catch(() => {});
  };

  const closeSession = (id: string) => {
    updateDoc(doc(db, COLLECTIONS.sessions, id), {
      status: 'DITUTUP',
      ditutupPada: new Date().toISOString(),
    }).catch(() => {});
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
      id: `${sessionId}_${currentUser.id}`,
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
      sessions, sessionsError, attendances, currentUser, role, authReady, isLoggedIn, profileReady,
      praktikanList, asistenList,
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