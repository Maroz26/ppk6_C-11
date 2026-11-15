import { useEffect, useState } from 'react';
import { Review, subscribeMyReviews, subscribeReviews } from '../services/reviewService';

type State = { data: Review[]; loading: boolean; error: string | null };
const EMPTY: State = { data: [], loading: false, error: null };
const ERROR_TEXT = 'Gagal memuat kesan & pesan.';

export function useMyReviews(uid?: string): State {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeMyReviews(
      uid,
      rows => setState({ data: rows, loading: false, error: null }),
      () => setState({ data: [], loading: false, error: ERROR_TEXT }),
    );
  }, [uid]);

  return uid ? state : EMPTY;
}

export function useSessionReviews(sessionId?: string): State {
  const [state, setState] = useState<State>({ data: [], loading: true, error: null });

  useEffect(
    () =>
      subscribeReviews(
        sessionId,
        rows => setState({ data: rows, loading: false, error: null }),
        () => setState({ data: [], loading: false, error: ERROR_TEXT }),
      ),
    [sessionId],
  );

  return state;
}
