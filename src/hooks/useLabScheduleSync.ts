// src/hooks/useLabScheduleSync.ts
// Dijalankan di perangkat asisten: setiap kali sesi dibuat, diubah, dibuka/ditutup,
// atau dihapus, salinan publiknya di koleksi labSchedule ikut diperbarui.
// Dengan cara ini halaman/servis lain tidak perlu diubah satu per satu.
import { useEffect, useRef, useState } from 'react';
import { listenLabSchedule, syncLabSchedule } from '../services/labScheduleService';
import { listenSessionsForUser } from '../services/scheduleService';
import { LabScheduleEntry, Session } from '../types';

export function useLabScheduleSync(userId: string | undefined, isAsisten: boolean) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [entries, setEntries] = useState<LabScheduleEntry[] | null>(null);
  const syncing = useRef(false);

  // Baca semua sesi (asisten boleh) dan semua salinan labSchedule.
  useEffect(() => {
    if (!userId || !isAsisten) {
      setSessions(null);
      setEntries(null);
      return;
    }
    const offSessions = listenSessionsForUser(
      { id: userId, role: 'ASISTEN' },
      setSessions,
      () => setSessions(null),
    );
    const offEntries = listenLabSchedule(setEntries, () => setEntries(null));
    return () => {
      offSessions();
      offEntries();
    };
  }, [userId, isAsisten]);

  // Sinkronkan hanya setelah KEDUA data selesai dimuat, supaya salinan tidak
  // terhapus semua karena daftar sesi belum sempat terisi. Kalau data berubah
  // saat sinkron masih berjalan, sinkron diulang setelah yang pertama selesai.
  const pending = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!sessions || !entries) return;
    if (syncing.current) {
      pending.current = true;
      return;
    }
    syncing.current = true;
    syncLabSchedule(sessions, entries)
      .catch((err) => console.warn('Sinkron labSchedule gagal', err))
      .finally(() => {
        syncing.current = false;
        if (pending.current) {
          pending.current = false;
          setRetry((n) => n + 1);
        }
      });
  }, [sessions, entries, retry]);
}