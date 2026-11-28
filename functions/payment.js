// Logika murni pembayaran denda lewat Midtrans Snap (Sandbox).
// Tidak menyentuh Firebase maupun jaringan, jadi bisa diuji dengan `npm test`.
// Dipakai oleh notifier/paymentServer.js (server di laptop) dan notifier/listener.js.
const crypto = require('crypto');

// ---------- Endpoint Midtrans ----------
const SNAP_URL = (isProduction) =>
  isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// Cek status transaksi (dipakai untuk verifikasi ulang setelah webhook).
const STATUS_URL = (isProduction, orderId) =>
  `${isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'}/v2/${encodeURIComponent(orderId)}/status`;

// Midtrans memakai Basic Auth: username = server key, password kosong.
function authHeader(serverKey) {
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY kosong');
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
}

// ---------- Order ID ----------
// Aturan Midtrans: maks 50 karakter, hanya huruf, angka, '-', '_', '~', '.'.
// id tagihan (sessionId_uid) bisa ~49 karakter, jadi dipotong; relasi lengkap
// ke tagihan tetap tersimpan di dokumen payments (field fineId).
// Satu tagihan boleh punya beberapa order (bayar ulang setelah gagal/kedaluwarsa).
function makeOrderId(fine, now = Date.now()) {
  const clean = (s) => String(s ?? '').replace(/[^A-Za-z0-9]/g, '');
  return `DND-${clean(fine.sessionId).slice(0, 8)}-${clean(fine.praktikanId).slice(0, 6)}-${now}`;
}

// ---------- Payload Snap ----------
// fine: data dokumen fines/{id}; customer: { nama, email }.
// finishUrl: deep link yang dibuka browser setelah selesai (mis. assist://pembayaran).
function buildSnapPayload({ orderId, fine, customer = {}, finishUrl, expiryMinutes = 60 }) {
  const amount = Math.round(Number(fine.nominal));
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Nominal denda tidak valid');

  const itemName = `Denda ${fine.praktikum ?? 'Praktikum'} P${fine.pertemuan ?? '-'}`.slice(0, 50);
  const payload = {
    transaction_details: { order_id: orderId, gross_amount: amount },
    item_details: [{ id: 'DENDA', price: amount, quantity: 1, name: itemName }],
    customer_details: {
      first_name: (customer.nama || fine.nama || 'Praktikan').slice(0, 50),
      ...(customer.email ? { email: customer.email } : {}),
    },
    expiry: { unit: 'minutes', duration: expiryMinutes },
  };
  if (finishUrl) payload.callbacks = { finish: finishUrl };
  return payload;
}

// ---------- Verifikasi webhook ----------
// signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
function computeSignature({ order_id, status_code, gross_amount }, serverKey) {
  return crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');
}

function verifySignature(notif, serverKey) {
  if (!notif || typeof notif.signature_key !== 'string' || !serverKey) return false;
  const expected = Buffer.from(computeSignature(notif, serverKey), 'hex');
  const given = Buffer.from(notif.signature_key, 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ---------- Pemetaan status ----------
// transaction_status Midtrans → status yang ditampilkan aplikasi.
function mapMidtransStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      // Kartu kredit: hanya 'accept' yang dianggap berhasil.
      return fraudStatus === 'accept' || !fraudStatus ? 'SUCCESS' : 'PENDING';
    case 'settlement':
      return 'SUCCESS';
    case 'pending':
      return 'PENDING';
    case 'deny':
    case 'cancel':
    case 'expire':
    case 'failure':
      return 'FAILED';
    default:
      return 'PENDING'; // status tak dikenal: jangan ambil keputusan
  }
}

// Status pembayaran → status tagihan. Gagal mengembalikan tagihan agar bisa dibayar ulang.
function fineStatusFor(paymentStatus) {
  if (paymentStatus === 'SUCCESS') return 'LUNAS';
  if (paymentStatus === 'PENDING') return 'MENUNGGU_PEMBAYARAN';
  return 'BELUM_DIBAYAR';
}

// Webhook bisa datang berulang atau tidak berurutan.
// SUCCESS bersifat final: tidak boleh diturunkan oleh notifikasi yang datang belakangan.
function shouldApply(currentStatus, nextStatus) {
  if (currentStatus === 'SUCCESS') return false;
  if (currentStatus === nextStatus) return false;
  return true;
}

// ---------- Format ----------
const rupiah = (n) => `Rp${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
const label = (x) => `${x.praktikum ?? 'Praktikum'} - Pertemuan ${x.pertemuan ?? '-'}`;

// Midtrans mengirim transaction_time "YYYY-MM-DD HH:mm:ss" dalam WIB (UTC+7).
function midtransTimeToIso(t) {
  if (!t || typeof t !== 'string') return null;
  const d = new Date(`${t.replace(' ', 'T')}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------- Notifikasi (bentuk sama dengan notifications.js) ----------
// Tagihan denda baru dibuat → praktikan pemilik tagihan.
function fromFineCreated(fine, fineId) {
  if (!fine?.praktikanId) return null;
  return {
    recipients: [fine.praktikanId],
    title: 'Tagihan denda baru',
    body: `Denda keterlambatan ${label(fine)} sebesar ${rupiah(fine.nominal)}. Ketuk untuk membayar.`,
    data: { type: 'FINE_NEW', fineId, sessionId: String(fine.sessionId ?? '') },
  };
}

// Hasil akhir pembayaran → praktikan. PENDING tidak dikirimi notifikasi.
function fromPaymentResult(payment, orderId) {
  if (!payment?.praktikanId) return null;
  if (payment.status === 'SUCCESS') {
    return {
      recipients: [payment.praktikanId],
      title: 'Pembayaran denda berhasil',
      body: `Pembayaran ${rupiah(payment.nominal)} untuk ${label(payment)} sudah diterima.`,
      data: { type: 'PAYMENT_SUCCESS', orderId, fineId: String(payment.fineId ?? '') },
    };
  }
  if (payment.status === 'FAILED') {
    return {
      recipients: [payment.praktikanId],
      title: 'Pembayaran denda gagal',
      body: `Pembayaran untuk ${label(payment)} ${payment.midtransStatus === 'expire' ? 'kedaluwarsa' : 'gagal'}. Silakan bayar ulang.`,
      data: { type: 'PAYMENT_FAILED', orderId, fineId: String(payment.fineId ?? '') },
    };
  }
  return null;
}

module.exports = {
  SNAP_URL,
  STATUS_URL,
  authHeader,
  makeOrderId,
  buildSnapPayload,
  computeSignature,
  verifySignature,
  mapMidtransStatus,
  fineStatusFor,
  shouldApply,
  midtransTimeToIso,
  rupiah,
  fromFineCreated,
  fromPaymentResult,
};