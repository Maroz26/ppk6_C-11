// src/hooks/useNow.ts
// Waktu sekarang yang diperbarui berkala, supaya status "sedang berlangsung"
// ikut berganti tanpa perlu membuka ulang halaman.
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
