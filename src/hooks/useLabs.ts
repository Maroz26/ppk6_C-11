// src/hooks/useLabs.ts
// Daftar laboratorium realtime dari Firestore (koleksi labs).
// Dipakai halaman kelola lab, form jadwal, dan halaman peta.
import { useEffect, useState } from 'react';
import { labErrorMessage, listenLabs } from '../services/labService';
import { Lab } from '../types';

export function useLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    return listenLabs(
      (data) => {
        setLabs(data);
        setError('');
        setLoading(false);
      },
      (err) => {
        setError(labErrorMessage(err));
        setLoading(false);
      },
    );
  }, []);

  return { labs, loading, error };
}