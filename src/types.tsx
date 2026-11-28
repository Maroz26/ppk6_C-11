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
  jarakMeter: number | null; // jarak user ke lab saat presensi; null jika lab/koordinat tidak tersedia
};

export type AttendanceResult = 
  | { ok: true; record: Attendance }
  | {
      ok: false;
      reason:
        | 'SESI_BELUM_DIBUKA'
        | 'SESI_DITUTUP'
        | 'SUDAH_PRESENSI'
        | 'LUAR_RADIUS'
        | 'LOKASI_TIDAK_VALID';
    };  
// ===== Skema Firestore (Sprint 2) =====
// Semua id pengguna memakai uid dari Firebase Authentication.
// users/{uid}                       -> User (tanpa field id)
// sessions/{sessionId}              -> Session (tanpa field id)
// attendances/{sessionId}_{uid}     -> Attendance
// permissions/{permissionId}        -> Permission
// reviews/{reviewId}                -> Review
// ===== Tambahan Sprint 3 =====
// labs/{labId}                      -> Lab (lokasi & radius acuan presensi)
// labSchedule/{sessionId}           -> LabScheduleEntry (salinan jadwal tanpa data peserta)
// ===== Tambahan Sprint 4 =====
// fines/{sessionId}_{uid}           -> Fine (tagihan denda; ditulis billingService P2)
// payments/{orderId}                -> Payment (transaksi Midtrans; HANYA ditulis server P3)
// config/payment                    -> PaymentConfig (URL backend; HANYA ditulis server P3)

export const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  attendances: 'attendances',
  permissions: 'permissions',
  reviews: 'reviews',
  labs: 'labs',
  labSchedule: 'labSchedule',
  fines: 'fines',
  payments: 'payments',
  config: 'config',
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

// Salinan publik jadwal sesi untuk peta laboratorium. Bisa dibaca semua pengguna,
// jadi sengaja TIDAK memuat enrolledStudents, materi, atau data pribadi lain.
// Ditulis otomatis dari perangkat asisten (useLabScheduleSync), id = id sesi.
export type LabScheduleEntry = {
  id: string;
  labId: string | null;
  ruang: string;
  praktikum: string;
  kelas: string;
  pertemuan: number;
  tanggal: string;     // YYYY-MM-DD
  jamMulai: string;    // HH:MM
  jamSelesai: string;  // HH:MM
  status: SessionStatus;
};

// ===== Sprint 4: Denda & Pembayaran =====

// Status tagihan denda.
// BELUM_DIBAYAR        : dibuat P2 saat praktikan terlambat (status awal)
// MENUNGGU_PEMBAYARAN  : server P3 sudah membuat transaksi Midtrans, belum ada hasil akhir
// LUNAS                : webhook Midtrans terverifikasi settlement/capture
// Pembayaran gagal/kedaluwarsa mengembalikan status ke BELUM_DIBAYAR agar bisa dibayar ulang.
// Status tagihan TIDAK PERNAH mengubah data presensi (attendances).
export type FineStatus = 'BELUM_DIBAYAR' | 'MENUNGGU_PEMBAYARAN' | 'LUNAS';

// Tagihan denda keterlambatan. id = `${sessionId}_${praktikanId}` sehingga
// satu kejadian terlambat = satu tagihan (tidak bisa dobel).
export type Fine = {
  id: string;
  praktikanId: string;
  nama: string;
  nim: string;
  sessionId: string;
  attendanceId: string;          // = `${sessionId}_${praktikanId}` (id dokumen attendances)
  praktikum: string;             // disalin dari sesi agar riwayat tetap terbaca
  pertemuan: number;
  nominal: number;               // rupiah, bilangan bulat
  menitTerlambat: number;
  status: FineStatus;
  dibuatPada: string;            // ISO
  dibayarPada: string | null;    // ISO, diisi server saat LUNAS
  paymentOrderId: string | null; // order_id transaksi terakhir, diisi server
};

// Status transaksi yang ditampilkan di aplikasi (hasil pemetaan status Midtrans).
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

// Satu percobaan pembayaran di Midtrans. id = order_id (unik per percobaan).
export type Payment = {
  id: string;
  fineId: string;
  praktikanId: string;
  sessionId: string;
  praktikum: string;
  pertemuan: number;
  nominal: number;
  status: PaymentStatus;
  midtransStatus: string;        // transaction_status asli, mis. pending/settlement/expire
  paymentType: string | null;    // mis. qris, bank_transfer, gopay
  snapToken: string;
  redirectUrl: string;
  tagihanPada: string;           // ISO, salinan Fine.dibuatPada
  dibuatPada: string;            // ISO, saat transaksi dibuat
  transaksiPada: string | null;  // ISO, transaction_time dari Midtrans
  diperbaruiPada: string;        // ISO, update terakhir dari webhook
};

// Dokumen config/payment: alamat backend pembayaran yang sedang aktif.
export type PaymentConfig = {
  apiUrl: string;
  diperbaruiPada: string;
};