import { Session, User } from '../types';

export const DUMMY_USERS: User[] = [
  { id: 'p1', nama: 'Silvani Sastra', nim: '24060124140001', role: 'PRAKTIKAN' },
  { id: 'p2', nama: 'Alyssa Liu', nim: '24060124140002', role: 'PRAKTIKAN' },
  { id: 'p3', nama: 'Anggita Kana', nim: '23060123140003', role: 'PRAKTIKAN' },
  { id: 'p4', nama: 'Revalina Alinea', nim: '23060123140004', role: 'PRAKTIKAN' },
  { id: 'p5', nama: 'Ruth Annisa', nim: '24060124140005', role: 'PRAKTIKAN' },
  { id: 'a1', nama: 'Asep Vivo', nim: '22060122140001', role: 'ASISTEN' },
  { id: 'a2', nama: 'Shasta Putri', nim: '22060122140002', role: 'ASISTEN' },
];

export const DUMMY_SESSIONS: Session[] = [
  {
    id: 's1',
    praktikum: 'Pemrograman Web',
    kelas: 'A',
    pertemuan: 1,
    materi: 'Pengenalan HTML & CSS',
    tanggal: '2026-10-27',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    ruang: 'Lab Komputer 1',
    status: 'DIBUKA',
    dibukaPada: '2026-10-27T08:00:00Z',
    ditutupPada: null,
    dibukaOleh: 'a1'
  },
  {
    id: 's2',
    praktikum: 'Pemrograman Web',
    kelas: 'B',
    pertemuan: 1,
    materi: 'Pengenalan HTML & CSS',
    tanggal: '2026-10-26',
    jamMulai: '10:30',
    jamSelesai: '12:30',
    ruang: 'Lab Komputer 1',
    status: 'DITUTUP',
    dibukaPada: '2026-10-26T10:25:00Z',
    ditutupPada: '2026-10-26T12:35:00Z',
    dibukaOleh: 'a1'
  },
  {
    id: 's3',
    praktikum: 'Basis Data',
    kelas: 'A',
    pertemuan: 3,
    materi: 'Normalisasi Data',
    tanggal: '2026-10-27',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    ruang: 'Lab Komputer 2',
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null
  },
  {
    id: 's4',
    praktikum: 'Basis Data',
    kelas: 'B',
    pertemuan: 3,
    materi: 'Normalisasi Data',
    tanggal: '2026-10-28',
    jamMulai: '08:00',
    jamSelesai: '10:00',
    ruang: 'Lab Komputer 2',
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null
  },
  {
    id: 's5',
    praktikum: 'Struktur Data',
    kelas: 'A',
    pertemuan: 5,
    materi: 'Linked List',
    tanggal: '2026-10-29',
    jamMulai: '10:30',
    jamSelesai: '12:30',
    ruang: 'Lab Komputer 3',
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null
  },
  {
    id: 's6',
    praktikum: 'Struktur Data',
    kelas: 'B',
    pertemuan: 5,
    materi: 'Linked List',
    tanggal: '2026-10-30',
    jamMulai: '13:00',
    jamSelesai: '15:00',
    ruang: 'Lab Komputer 3',
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null
  },
  {
    id: 's7',
    praktikum: 'Sistem Operasi',
    kelas: 'A',
    pertemuan: 2,
    materi: 'Manajemen Proses & Memory',
    tanggal: '2026-10-28',
    jamMulai: '10:00',
    jamSelesai: '12:00',
    ruang: 'Lab Komputer 4',
    status: 'BELUM_DIBUKA',
    dibukaPada: null,
    ditutupPada: null,
    dibukaOleh: null
  }
];

// Pemetaan ID Sesi Praktikum yang diikuti/diampu oleh setiap User
export const USER_ENROLLMENTS: Record<string, string[]> = {
  // Praktikan Angkatan 2024 (Pemrograman Web A & Struktur Data A)
  'p1': ['s1', 's5'],
  'p2': ['s1', 's5'],

  // Praktikan Angkatan 2023 (Basis Data A & Sistem Operasi A)
  'p3': ['s3', 's7'],
  'p4': ['s3', 's7'],

  // Praktikan Kelas B (Pemrograman Web B & Basis Data B)
  'p5': ['s2', 's4'], 

  // Asisten & Mata Praktikum yang Diampu
  'a1': ['s1', 's2', 's5', 's6'],
  'a2': ['s3', 's4', 's7'],  
};