// src/hooks/useLabSchedule.ts
// Jadwal lab publik (koleksi labSchedule) realtime, untuk semua peran.
import { useEffect, useState } from 'react';
import { listenLabSchedule } from '../services/labScheduleService';
import { labErrorMessage } from '../services/labService';
import { LabScheduleEntry } from '../types';

export function useLabSchedule() {
  const [entries, setEntries] = useState<LabScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    return listenLabSchedule(
      (data) => {
        setEntries(data);
        setError('');
        setLoading(false);
      },
      (err) => {
        setError(labErrorMessage(err));
        setLoading(false);
      },
    );
  }, []);

  return { entries, loading, error };
}
