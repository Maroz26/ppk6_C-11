// src/services/reviewAiService.ts
// Klasifikasi sentimen kesan & pesan memakai model EDOM lokal di folder ai/.
// Model berjalan di perangkat (JavaScript murni), tanpa jaringan dan tanpa modul native.
import model from '../../ai/model-edom.json';
// @ts-ignore -- sentiment.js tidak punya definisi tipe
import { createSentimentClassifier } from '../../ai/sentiment.js';

export const BELUM_DIKLASIFIKASI = 'BELUM_DIKLASIFIKASI';

// Model dibuat sekali saat file dimuat, bukan setiap kali ulasan dikirim.
const classify = createSentimentClassifier(model);

async function runModel(teks: string): Promise<string> {
  const prediction = classify(teks);
  return String(prediction?.label ?? '');
}

export async function classifyReview(teks: string): Promise<string> {
  try {
    const label = await runModel(teks);
    return label.trim() || BELUM_DIKLASIFIKASI;
  } catch {
    return BELUM_DIKLASIFIKASI;
  }
}