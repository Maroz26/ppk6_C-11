export type SessionStatus = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';

export type Session = {
  id: string;
  praktikum: string;
  kelas: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  pertemuan: number;
  materi: string;
  status: SessionStatus;
  dibukaPada: string | null;
  ditutupPada: string | null;
  dibukaOleh: string | null;
  dibuatOleh: string;
  enrolledStudents: string[];
};

export type Role = 'PRAKTIKAN' | 'ASISTEN';

export type User = {
  id: string;
  nama: string;
  nim: string;
  email: string;
  role: Role;
};

export type Attendance = {
  id: string;
  sessionId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  waktu: string;
  catatan: string;
};

export type AttendanceResult = 
  | { ok: true; record: Attendance }
  | { ok: false; reason: 'SESI_BELUM_DIBUKA' | 'SESI_DITUTUP' | 'SUDAH_PRESENSI' };

  
// ===== Skema Firestore (Sprint 2) =====
// Semua id pengguna memakai uid dari Firebase Authentication.
// users/{uid}                       -> User (tanpa field id)
// sessions/{sessionId}              -> Session (tanpa field id)
// attendances/{sessionId}_{uid}     -> Attendance
// permissions/{permissionId}        -> Permission
// reviews/{reviewId}                -> Review

export const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  attendances: 'attendances',
  permissions: 'permissions',
  reviews: 'reviews',
} as const;

export type PermissionStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

export type Permission = {
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

export type Review = {
  id: string;
  sessionId: string;
  praktikanId: string;
  nama: string;
  nim: string;
  teks: string;
  sentimen: string;
  dibuatPada: string;
};