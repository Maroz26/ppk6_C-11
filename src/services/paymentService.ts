// src/services/paymentService.ts
// Pembayaran denda lewat Midtrans Snap Sandbox.
// Aplikasi TIDAK memegang server key: transaksi dibuat oleh server pembayaran (notifier/paymentServer.js)
// dan status lunas hanya ditulis server dari webhook Midtrans. Aplikasi cukup:
//   1. meminta server membuat transaksi (dengan ID token Firebase sebagai bukti login),
//   2. membuka halaman pembayaran Midtrans,
//   3. mendengarkan koleksi fines & payments secara realtime (tetap tersimpan walau app ditutup).
import { getIdToken } from '@react-native-firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { openAuthSessionAsync } from 'expo-web-browser';
import { auth, db } from '../config/firebase';
import { COLLECTIONS, Fine, FineStatus, Payment, PaymentConfig, PaymentStatus } from '../types';

// Deep link yang dibuka Midtrans setelah selesai (scheme "assist" ada di app.json).
// Harus sama dengan finishUrl di notifier/paymentServer.js.
export const PAYMENT_RETURN_URL = 'assist://pembayaran';

const REQUEST_TIMEOUT_MS = 20000;

type Snapshot = { docs: { id: string; data: () => unknown }[] };
type ErrorListener = (error: Error) => void;

const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

// ===== Alamat server pembayaran =====
// Dibaca dari Firestore config/payment (ditulis server saat start), jadi URL tunnel boleh berganti
// tanpa build ulang APK. Cache dibuang jika request gagal agar URL baru terbaca.
let cachedApiUrl: string | null = null;

async function getApiUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;
  const snap = await getDoc(doc(db, COLLECTIONS.config, 'payment'));
  const data = snap.data() as PaymentConfig | undefined;
  if (!data?.apiUrl) {
    throw new Error('Server pembayaran belum aktif. Hubungi asisten/pengelola.');
  }
  cachedApiUrl = data.apiUrl.replace(/\/+$/, '');
  return cachedApiUrl;
}

// Request ke server pembayaran dengan ID token Firebase (diverifikasi server lewat Admin SDK).
async function callPaymentApi<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Silakan login terlebih dahulu.');
  const token = await getIdToken(user);
  const base = await getApiUrl();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (e) {
    cachedApiUrl = null; // mungkin URL tunnel sudah berganti
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new Error(
      aborted
        ? 'Server pembayaran tidak merespons. Coba lagi sebentar lagi.'
        : 'Tidak bisa terhubung ke server pembayaran. Periksa koneksi internet.',
    );
  } finally {
    clearTimeout(timer);
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(body.error || `Server pembayaran error (HTTP ${res.status}).`);
  return body;
}

// ===== Aksi pembayaran =====
export type StartPaymentResult = { orderId: string; redirectUrl: string; reused: boolean };

// Minta server membuat (atau memakai ulang) transaksi Snap untuk satu tagihan.
export function createPayment(fineId: string): Promise<StartPaymentResult> {
  return callPaymentApi<StartPaymentResult>('/payment/create', { method: 'POST', body: { fineId } });
}

// Buka halaman pembayaran Midtrans di browser dalam aplikasi.
// Selesai saat Midtrans mengarahkan ke assist://pembayaran atau pengguna menutup browser.
export async function openPaymentPage(redirectUrl: string): Promise<'returned' | 'closed'> {
  const result = await openAuthSessionAsync(redirectUrl, PAYMENT_RETURN_URL);
  return result.type === 'success' ? 'returned' : 'closed';
}

// Minta server mengecek status langsung ke Midtrans (cadangan jika webhook terlambat).
// Hasilnya juga ditulis server ke Firestore, jadi listener ikut terbarui.
export function syncPaymentStatus(orderId: string) {
  return callPaymentApi<{ orderId: string; status: PaymentStatus; midtransStatus: string }>(
    `/payment/status/${encodeURIComponent(orderId)}`,
    { method: 'GET' },
  );
}

// Alur lengkap tombol "Bayar": buat transaksi → buka halaman bayar → sinkron status.
export async function payFine(fineId: string): Promise<{ orderId: string; status: PaymentStatus | null }> {
  const { orderId, redirectUrl } = await createPayment(fineId);
  await openPaymentPage(redirectUrl);
  try {
    const { status } = await syncPaymentStatus(orderId);
    return { orderId, status };
  } catch {
    // Tidak masalah: status tetap akan diperbarui lewat webhook + listener realtime.
    return { orderId, status: null };
  }
}

// ===== Listener realtime =====
// Filter praktikanId wajib karena rules menolak list tanpa filter.
// Urutan diatur di aplikasi supaya tidak butuh indeks gabungan Firestore.

export function listenMyFines(
  praktikanId: string,
  listener: (fines: Fine[]) => void,
  onError?: ErrorListener,
) {
  const q = query(collection(db, COLLECTIONS.fines), where('praktikanId', '==', praktikanId));
  return onSnapshot(
    q,
    (snap: Snapshot) =>
      listener(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Fine, 'id'>) }))
          .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada)),
      ),
    (e: unknown) => onError?.(toError(e)),
  );
}

export function listenMyPayments(
  praktikanId: string,
  listener: (payments: Payment[]) => void,
  onError?: ErrorListener,
) {
  const q = query(collection(db, COLLECTIONS.payments), where('praktikanId', '==', praktikanId));
  return onSnapshot(
    q,
    (snap: Snapshot) =>
      listener(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, 'id'>) }))
          .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada)),
      ),
    (e: unknown) => onError?.(toError(e)),
  );
}

// ===== Format tampilan =====
export const formatRupiah = (n: number) => `Rp${Math.round(n || 0).toLocaleString('id-ID')}`;

export const FINE_STATUS_LABEL: Record<FineStatus, string> = {
  BELUM_DIBAYAR: 'Belum dibayar',
  MENUNGGU_PEMBAYARAN: 'Menunggu pembayaran',
  LUNAS: 'Lunas',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Berhasil',
  FAILED: 'Gagal',
};

// Nama metode bayar dari payment_type Midtrans.
export function paymentTypeLabel(type: string | null): string {
  switch (type) {
    case 'qris': return 'QRIS';
    case 'gopay': return 'GoPay';
    case 'shopeepay': return 'ShopeePay';
    case 'bank_transfer': return 'Transfer bank (VA)';
    case 'echannel': return 'Mandiri Bill';
    case 'credit_card': return 'Kartu kredit';
    case 'cstore': return 'Gerai retail';
    case null:
    case undefined:
    case '': return '-';
    default: return type;
  }
}