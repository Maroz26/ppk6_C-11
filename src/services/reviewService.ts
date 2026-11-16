// src/services/reviewService.ts
// Kesan & pesan praktikan disimpan di koleksi reviews Firestore,
// lengkap dengan label sentimen dari model EDOM (reviewAiService).
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../types';
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

type Snapshot = { docs: { id: string; data: () => unknown }[] };

function toReviews(snapshot: Snapshot): Review[] {
  return snapshot.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }))
    // Urutkan di aplikasi (terbaru di atas) supaya tidak perlu indeks gabungan Firestore.
    .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada));
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

// Klasifikasi dijalankan di perangkat sebelum disimpan, lalu teks dan labelnya
// ditulis bersama ke reviews. Rules hanya mengizinkan praktikan menulis atas namanya sendiri.
export async function submitReview(sessionId: string, user: Author, teks: string): Promise<Review> {
  const sentimen = await classifyReview(teks);
  const data = {
    sessionId,
    praktikanId: user.id,
    nama: user.nama,
    nim: user.nim,
    teks,
    sentimen,
    dibuatPada: new Date().toISOString(),
  };
  const created = await addDoc(collection(db, COLLECTIONS.reviews), data);
  return { id: created.id, ...data };
}

// Ulasan milik praktikan yang sedang login, realtime.
// Filter praktikanId wajib: rules menolak praktikan membaca ulasan orang lain.
export const subscribeMyReviews = (
  uid: string,
  onData: (r: Review[]) => void,
  onError: (e: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collection(db, COLLECTIONS.reviews), where('praktikanId', '==', uid)),
    (snapshot) => onData(toReviews(snapshot)),
    (error) => onError(toError(error)),
  );

// Ulasan untuk asisten, realtime. Tanpa sessionId: semua ulasan.
export const subscribeReviews = (
  sessionId: string | undefined,
  onData: (r: Review[]) => void,
  onError: (e: Error) => void,
): Unsubscribe => {
  const reviewsRef = collection(db, COLLECTIONS.reviews);
  const source = sessionId ? query(reviewsRef, where('sessionId', '==', sessionId)) : reviewsRef;
  return onSnapshot(
    source,
    (snapshot) => onData(toReviews(snapshot)),
    (error) => onError(toError(error)),
  );
};