// src/services/reviewAiService.ts
export const BELUM_DIKLASIFIKASI = 'BELUM_DIKLASIFIKASI';

// TODO: hubungkan ke model EDOM yang disediakan (API/file), kembalikan label sentimennya.
async function runModel(_teks: string): Promise<string> {
  throw new Error('Model EDOM belum dihubungkan');
}

export async function classifyReview(teks: string): Promise<string> {
  try {
    const label = await runModel(teks);
    return label.trim() || BELUM_DIKLASIFIKASI;
  } catch {
    return BELUM_DIKLASIFIKASI;
  }
}
