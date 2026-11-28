// src/hooks/useNotifications.ts
// Daftar pemberitahuan di dalam aplikasi, disusun dari data Firestore yang sudah ada
// (sesi, presensi, izin, ulasan; Sprint 4: tagihan denda & pembayaran). Tidak bergantung pada FCM,
// jadi tetap muncul walaupun notifikasi push tidak sampai.
// Status "sudah dibaca" disimpan di perangkat (AsyncStorage) per akun.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  listenPermissionsByPraktikan,
  listenPermissionsForAssistant,
  PermissionRecord,
} from '../services/permissionService';
import { formatRupiah, listenMyFines, listenMyPayments } from '../services/paymentService';
import { Review, subscribeReviews } from '../services/reviewService';
import { Fine, Payment } from '../types';
import { toLocalDate } from '../utils/dateId';
import { useMyAttendances } from './useAttendanceData';
import { useNow } from './useNow';

export type NotifKind =
  | 'presensi'
  | 'jadwal'
  | 'izin'
  | 'izinDiterima'
  | 'izinDitolak'
  | 'alpa'
  | 'ulasan'
  | 'pengingat'
  // Sprint 4
  | 'denda'
  | 'bayarBerhasil'
  | 'bayarGagal';

export type NotifItem = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: Date;      // waktu kejadian (ditampilkan dan dipakai untuk urutan)
  appearAt?: Date; // sejak kapan pemberitahuan muncul, untuk pengingat waktu mendatang
  href: string;    // halaman yang dibuka saat ditekan
};

const WINDOW_DAYS = 14; // hanya kejadian 14 hari terakhir

// ===== Penyimpanan "terakhir dibaca" (dibagi antar layar lewat pendengar) =====
const lastSeenCache: Record<string, number> = {};
const listeners = new Set<() => void>();
const key = (uid: string) => `assist:notif-last-seen:${uid}`;

async function loadLastSeen(uid: string) {
  if (lastSeenCache[uid] !== undefined) return lastSeenCache[uid];
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    lastSeenCache[uid] = raw ? Number(raw) : 0;
  } catch {
    lastSeenCache[uid] = 0;
  }
  return lastSeenCache[uid];
}

export async function markNotificationsSeen(uid: string) {
  lastSeenCache[uid] = Date.now();
  listeners.forEach((l) => l());
  try {
    await AsyncStorage.setItem(key(uid), String(lastSeenCache[uid]));
  } catch {
    // Gagal menyimpan tidak apa-apa; status dibaca hanya hilang setelah aplikasi ditutup.
  }
}

function useLastSeen(uid?: string) {
  const [value, setValue] = useState<number | null>(uid ? lastSeenCache[uid] ?? null : null);
  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    const sync = () => active && setValue(lastSeenCache[uid] ?? 0);
    loadLastSeen(uid).then(sync);
    listeners.add(sync);
    return () => {
      active = false;
      listeners.delete(sync);
    };
  }, [uid]);
  return value;
}

// ===== Hook utama =====
export function useNotifications() {
  const { currentUser, sessions, role } = useApp();
  const uid = currentUser?.id;
  const isAsisten = role === 'ASISTEN';
  const now = useNow(60000);
  const lastSeen = useLastSeen(uid);

  const { data: attendances } = useMyAttendances(!isAsisten ? uid : undefined);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!uid) return undefined;
    return isAsisten
      ? listenPermissionsForAssistant(uid, sessions, setPermissions)
      : listenPermissionsByPraktikan(uid, setPermissions);
  }, [uid, isAsisten, sessions]);

  useEffect(() => {
    if (!uid || !isAsisten) return undefined;
    return subscribeReviews(undefined, setReviews, () => setReviews([]));
  }, [uid, isAsisten]);

  // Sprint 4: tagihan denda & transaksi pembayaran milik praktikan.
  useEffect(() => {
    if (!uid || isAsisten) return undefined;
    const offFines = listenMyFines(uid, setFines, () => setFines([]));
    const offPayments = listenMyPayments(uid, setPayments, () => setPayments([]));
    return () => {
      offFines();
      offPayments();
    };
  }, [uid, isAsisten]);

  const items = useMemo<NotifItem[]>(() => {
    if (!uid) return [];
    const list: NotifItem[] = [];
    const since = now.getTime() - WINDOW_DAYS * 86400000;
    const iso = (v: string | null | undefined) => (v ? new Date(v) : null);

    if (!isAsisten) {
      const attended = new Set(attendances.map((a) => a.sessionId));
      const izinOk = new Set(permissions.filter((p) => p.status === 'DITERIMA').map((p) => p.sessionId));
      sessions
        .filter((s) => s.enrolledStudents?.includes(uid))
        .forEach((s) => {
          const start = toLocalDate(s.tanggal, s.jamMulai);
          // Presensi dibuka dan belum hadir.
          if (s.status === 'DIBUKA' && !attended.has(s.id)) {
            list.push({
              id: `buka-${s.id}`,
              kind: 'presensi',
              title: `Presensi dibuka: ${s.praktikum}`,
              body: `Kelas ${s.kelas} · ${s.jamMulai} - ${s.jamSelesai}. Segera presensi di dalam area lab.`,
              time: iso(s.dibukaPada) ?? now,
              href: `/presensi/${s.id}`,
            });
          }
          // Pengingat: praktikum dalam 24 jam ke depan.
          if (s.status === 'BELUM_DIBUKA' && start && start > now && start.getTime() - now.getTime() < 86400000) {
            list.push({
              id: `ingat-${s.id}`,
              kind: 'pengingat',
              title: `Praktikum ${s.praktikum} segera dimulai`,
              body: `Kelas ${s.kelas} · ${s.ruang} · pukul ${s.jamMulai}.`,
              time: start,
              appearAt: new Date(start.getTime() - 86400000),
              href: `/sesi/${s.id}`,
            });
          }
          // Sesi ditutup dan tidak tercatat hadir / izin.
          const tutup = iso(s.ditutupPada);
          if (s.status === 'DITUTUP' && !attended.has(s.id) && !izinOk.has(s.id) && tutup) {
            list.push({
              id: `alpa-${s.id}`,
              kind: 'alpa',
              title: `Kamu tidak tercatat hadir`,
              body: `${s.praktikum} · Kelas ${s.kelas} · Pertemuan ${s.pertemuan}.`,
              time: tutup,
              href: `/sesi/${s.id}`,
            });
          }
        });
      // Keputusan izin.
      permissions
        .filter((p) => p.status !== 'MENUNGGU' && p.diputuskanPada)
        .forEach((p) => {
          const s = sessions.find((x) => x.id === p.sessionId);
          const ok = p.status === 'DITERIMA';
          list.push({
            id: `izin-${p.id}`,
            kind: ok ? 'izinDiterima' : 'izinDitolak',
            title: ok ? 'Izinmu diterima' : 'Izinmu ditolak',
            body: s ? `${s.praktikum} · Kelas ${s.kelas} · Pertemuan ${s.pertemuan}.` : p.alasan,
            time: new Date(p.diputuskanPada as string),
            href: '/praktikan/izin',
          });
        });
      // Sprint 4: tagihan denda baru (tetap tampil walau sudah lunas, sebagai catatan).
      fines.forEach((f) => {
        list.push({
          id: `denda-${f.id}`,
          kind: 'denda',
          title: 'Tagihan denda baru',
          body: `${f.praktikum} · Pertemuan ${f.pertemuan} · terlambat ${f.menitTerlambat} menit · ${formatRupiah(f.nominal)}.`,
          time: new Date(f.dibuatPada),
          href: '/pembayaran',
        });
      });
      // Sprint 4: hasil akhir pembayaran (PENDING tidak ditampilkan).
      payments
        .filter((p) => p.status !== 'PENDING')
        .forEach((p) => {
          const ok = p.status === 'SUCCESS';
          list.push({
            id: `bayar-${p.id}`,
            kind: ok ? 'bayarBerhasil' : 'bayarGagal',
            title: ok ? 'Pembayaran denda berhasil' : 'Pembayaran denda gagal',
            body: ok
              ? `${formatRupiah(p.nominal)} untuk ${p.praktikum} · Pertemuan ${p.pertemuan} sudah diterima.`
              : `${p.praktikum} · Pertemuan ${p.pertemuan}: ${p.midtransStatus === 'expire' ? 'kedaluwarsa' : 'gagal'}. Silakan bayar ulang.`,
            time: new Date((ok ? p.transaksiPada : null) ?? p.diperbaruiPada),
            href: ok ? '/pembayaran/riwayat' : '/pembayaran',
          });
        });
    } else {
      const mine = sessions.filter((s) => s.dibuatOleh === uid);
      const mineIds = new Set(mine.map((s) => s.id));
      // Pengajuan izin baru.
      permissions
        .filter((p) => p.status === 'MENUNGGU')
        .forEach((p) => {
          const s = sessions.find((x) => x.id === p.sessionId);
          list.push({
            id: `izin-${p.id}`,
            kind: 'izin',
            title: `Izin baru dari ${p.nama}`,
            body: `${s ? `${s.praktikum} · Kelas ${s.kelas}. ` : ''}"${p.alasan}"`,
            time: new Date(p.diajukanPada),
            href: '/asisten/izin',
          });
        });
      mine.forEach((s) => {
        const start = toLocalDate(s.tanggal, s.jamMulai);
        const end = toLocalDate(s.tanggal, s.jamSelesai);
        // Sudah waktunya membuka presensi (mulai 15 menit sebelum jam mulai).
        if (s.status === 'BELUM_DIBUKA' && start && end && now.getTime() > start.getTime() - 15 * 60000 && now < end) {
          list.push({
            id: `buka-${s.id}`,
            kind: 'presensi',
            title: `Saatnya membuka presensi`,
            body: `${s.praktikum} · Kelas ${s.kelas} dimulai pukul ${s.jamMulai}.`,
            time: start,
            appearAt: new Date(start.getTime() - 15 * 60000),
            href: `/sesi/${s.id}`,
          });
        }
        // Presensi masih dibuka padahal jam sesi sudah lewat.
        if (s.status === 'DIBUKA' && end && now > end) {
          list.push({
            id: `tutup-${s.id}`,
            kind: 'jadwal',
            title: `Presensi belum ditutup`,
            body: `${s.praktikum} · Kelas ${s.kelas} sudah selesai pukul ${s.jamSelesai}.`,
            time: end,
            href: `/sesi/${s.id}`,
          });
        }
        // Pengingat mengajar dalam 24 jam ke depan.
        if (s.status === 'BELUM_DIBUKA' && start && start.getTime() - now.getTime() > 15 * 60000 && start.getTime() - now.getTime() < 86400000) {
          list.push({
            id: `ingat-${s.id}`,
            kind: 'pengingat',
            title: `Kamu mengajar ${s.praktikum}`,
            body: `Kelas ${s.kelas} · ${s.ruang} · pukul ${s.jamMulai}.`,
            time: start,
            appearAt: new Date(start.getTime() - 86400000),
            href: `/sesi/${s.id}`,
          });
        }
      });
      // Ulasan baru pada sesi milikmu.
      reviews
        .filter((r) => mineIds.has(r.sessionId))
        .forEach((r) => {
          const s = sessions.find((x) => x.id === r.sessionId);
          list.push({
            id: `ulasan-${r.id}`,
            kind: 'ulasan',
            title: `Ulasan baru${s ? ` di ${s.praktikum}` : ''}`,
            body: `${r.nama}: "${r.teks.length > 80 ? `${r.teks.slice(0, 80)}...` : r.teks}"`,
            time: new Date(r.dibuatPada),
            href: `/ulasan?sessionId=${r.sessionId}`,
          });
        });
    }

    return list
      .filter((n) => !Number.isNaN(n.time.getTime()) && (n.appearAt ?? n.time).getTime() >= since)
      .sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [uid, isAsisten, sessions, attendances, permissions, reviews, fines, payments, now]);

  // Belum dibaca = muncul setelah halaman Pemberitahuan terakhir dibuka.
  const isUnread = (n: NotifItem) => lastSeen !== null && (n.appearAt ?? n.time).getTime() > lastSeen;
  const unreadCount = lastSeen === null ? 0 : items.filter(isUnread).length;

  return { items, unreadCount, isUnread, now };
}