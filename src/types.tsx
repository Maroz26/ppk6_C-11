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
};

export type Role = 'PRAKTIKAN' | 'ASISTEN';

export type User = {
  id: string;
  nama: string;
  nim: string;
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