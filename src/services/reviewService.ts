import { classifyReview } from './reviewAiService';

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

type Author = { id: string; nama: string; nim: string };
export type Unsubscribe = () => void;

let store: Review[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export async function submitReview(sessionId: string, user: Author, teks: string): Promise<Review> {
  const sentimen = await classifyReview(teks);
  const review: Review = {
    id: `r${Date.now()}`,
    sessionId,
    praktikanId: user.id,
    nama: user.nama,
    nim: user.nim,
    teks,
    sentimen,
    dibuatPada: new Date().toISOString(),
  };
  store = [...store, review];
  emit();
  return review;
}

function listen(filter: (r: Review) => boolean, onData: (rows: Review[]) => void): Unsubscribe {
  const push = () => onData(store.filter(filter).sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada)));
  listeners.add(push);
  push();
  return () => {
    listeners.delete(push);
  };
}

export const subscribeMyReviews = (uid: string, onData: (r: Review[]) => void, _onError: (e: Error) => void) =>
  listen(r => r.praktikanId === uid, onData);

export const subscribeReviews = (
  sessionId: string | undefined,
  onData: (r: Review[]) => void,
  _onError: (e: Error) => void,
) => listen(r => !sessionId || r.sessionId === sessionId, onData);
