// src/hooks/useAttendanceData.ts
import { useEffect, useState } from 'react';
import {
  subscribeAllAttendances,
  subscribeAttendanceByPraktikan,
  subscribeAttendanceBySession,
} from '../services/attendanceService';
import { Attendance } from '../types';

type State = { data: Attendance[]; loading: boolean; error: string | null };
const EMPTY: State = { data: [], loading: false, error: null };

type Subscribe = typeof subscribeAttendanceBySession;

function useAttendanceSubscription(key: string | undefined, subscribe: Subscribe): State {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!key) return undefined;
    return subscribe(
      key,
      rows => setState({ data: rows, loading: false, error: null }),
      () => setState({ data: [], loading: false, error: 'Gagal memuat data kehadiran.' }),
    );
  }, [key, subscribe]);

  return key ? state : EMPTY;
}

export const useSessionAttendances = (sessionId?: string) =>
  useAttendanceSubscription(sessionId, subscribeAttendanceBySession);

export const useMyAttendances = (uid?: string) =>
  useAttendanceSubscription(uid, subscribeAttendanceByPraktikan);

// Semua presensi (khusus asisten). enabled=false untuk praktikan supaya tidak ditolak rules.
export function useAllAttendances(enabled: boolean): State {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeAllAttendances(
      rows => setState({ data: rows, loading: false, error: null }),
      () => setState({ data: [], loading: false, error: 'Gagal memuat data kehadiran.' }),
    );
  }, [enabled]);

  return enabled ? state : EMPTY;
}
