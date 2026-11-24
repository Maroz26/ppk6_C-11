// src/hooks/useIsOnline.ts
// Status koneksi internet (expo-network). Modul dimuat saat dipakai supaya
// aplikasi tetap jalan di dev build lama yang belum berisi expo-network.
import type * as NetworkModule from 'expo-network';
import { useEffect, useState } from 'react';

function loadNetwork(): typeof NetworkModule | null {
  try {
    return require('expo-network') as typeof NetworkModule;
  } catch {
    return null;
  }
}

// true = online, false = offline, null = belum diketahui / tidak didukung.
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const Network = loadNetwork();
    if (!Network) return;
    const read = (state: NetworkModule.NetworkState) => {
      if (state.isConnected === false || state.isInternetReachable === false) setOnline(false);
      else if (state.isConnected) setOnline(true);
    };
    Network.getNetworkStateAsync().then(read).catch(() => {});
    const sub = Network.addNetworkStateListener(read);
    return () => sub.remove();
  }, []);

  return online;
}
