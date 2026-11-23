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
  // Sprint 3: id dokumen di koleksi labs. Sesi lama (sprint 2) belum punya,
  // jadi dicocokkan lewat nama ruang (lihat findLabForSession di labService).
  labId?: string | null;
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
// ===== Tambahan Sprint 3 =====
// labs/{labId}                      -> Lab (lokasi & radius acuan presensi)

export const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  attendances: 'attendances',
  permissions: 'permissions',
  reviews: 'reviews',
  labs: 'labs',
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

// Laboratorium beserta titik koordinat dan radius presensi.
// radius dalam meter; batasnya RADIUS_MIN..RADIUS_MAX di labService (sama dengan rules).
export type Lab = {
  id: string;
  nama: string;          // harus sama dengan nilai "ruang" pada sesi, mis. "Lab Komputer 1"
  gedung: string;
  deskripsi: string;
  latitude: number;
  longitude: number;
  radius: number;
  diperbaruiOleh: string;
  diperbaruiPada: string;
};