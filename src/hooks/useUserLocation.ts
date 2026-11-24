// src/hooks/useUserLocation.ts
// Posisi pengguna yang terus diperbarui selama halaman sedang dibuka (fokus).
// Pemantauan berhenti saat pindah halaman supaya hemat baterai.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { DeviceLocation, LocationFailReason, watchLocation } from '../services/locationService';

export type UserLocationState = {
  location: DeviceLocation | null;
  fail: LocationFailReason | null;
  watching: boolean;
  retry: () => void;
};

export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [fail, setFail] = useState<LocationFailReason | null>(null);
  const [watching, setWatching] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let stop: (() => void) | null = null;
      let cancelled = false;

      const start = () => {
        setWatching(true);
        setFail(null);
        watchLocation(
          (loc) => {
            if (cancelled) return;
            setLocation(loc);
            setFail(null);
          },
          (reason) => {
            if (cancelled) return;
            setFail(reason);
            setWatching(false);
          },
        ).then((stopFn) => {
          if (cancelled) stopFn();
          else stop = stopFn;
        });
      };
      start();

      // Setelah pengguna kembali dari Pengaturan (izin/GPS), coba lagi otomatis.
      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active' && !cancelled) {
          stop?.();
          stop = null;
          start();
        }
      });

      return () => {
        cancelled = true;
        stop?.();
        appStateSub.remove();
        setWatching(false);
      };
    }, [attempt]),
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { location, fail, watching, retry };
}
