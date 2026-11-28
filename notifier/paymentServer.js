// Server pembayaran denda (Midtrans Snap Sandbox) yang berjalan di laptop bersama listener.js.
// Server key Midtrans HANYA ada di sini (notifier/.env), tidak pernah di aplikasi React Native.
//
// Endpoint:
//   GET  /health                     → cek server hidup
//   POST /payment/create             → buat transaksi Snap untuk satu tagihan (butuh login)
//   GET  /payment/status/:orderId    → sinkron ulang status dari Midtrans (butuh login)
//   POST /payment/notification       → webhook dari Midtrans (diverifikasi signature + cek status)
//
// Status lunas HANYA ditulis dari hasil verifikasi server (webhook / cek status ke Midtrans),
// tidak pernah dari respons aplikasi. Data presensi (attendances) tidak pernah disentuh.
const http = require('http');
const {
  SNAP_URL,
  STATUS_URL,
  authHeader,
  makeOrderId,
  buildSnapPayload,
  verifySignature,
  mapMidtransStatus,
  fineStatusFor,
  shouldApply,
  midtransTimeToIso,
  fromPaymentResult,
} = require('../functions/payment');

const EXPIRY_MINUTES = 60;
const MAX_BODY = 64 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Body terlalu besar'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// deps disuntikkan agar bisa diuji tanpa Firebase/Midtrans asli.
//   db        : Firestore (firebase-admin)
//   auth      : Auth (firebase-admin) — dipakai verifyIdToken
//   deliver   : fungsi kirim notifikasi (dari listener.js)
//   fetchImpl : fetch (default: fetch bawaan Node 18+)
//   env       : { serverKey, isProduction, publicUrl, port }
function createPaymentServer({ db, auth, deliver, fetchImpl = fetch, env }) {
  const { serverKey, isProduction = false, publicUrl = '' } = env;
  const notificationUrl = publicUrl ? `${publicUrl.replace(/\/+$/, '')}/payment/notification` : '';

  const finesCol = db.collection('fines');
  const paymentsCol = db.collection('payments');

  // ---------- Autentikasi pengguna aplikasi ----------
  async function requireUser(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) throw new HttpError(401, 'Token login tidak ada');
    try {
      const decoded = await auth.verifyIdToken(token);
      return decoded.uid;
    } catch {
      throw new HttpError(401, 'Token login tidak valid / kedaluwarsa');
    }
  }

  // ---------- Panggilan ke Midtrans ----------
  async function midtransCreate(payload) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(serverKey),
    };
    // URL webhook dikirim per transaksi → dashboard Midtrans tidak perlu diubah
    // walaupun URL tunnel berganti.
    if (notificationUrl) headers['X-Override-Notification'] = notificationUrl;

    const r = await fetchImpl(SNAP_URL(isProduction), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || !body.token) {
      const msg = Array.isArray(body.error_messages) ? body.error_messages.join('; ') : `HTTP ${r.status}`;
      throw new HttpError(502, `Midtrans menolak transaksi: ${msg}`);
    }
    return body; // { token, redirect_url }
  }

  async function midtransStatus(orderId) {
    const r = await fetchImpl(STATUS_URL(isProduction, orderId), {
      headers: { Accept: 'application/json', Authorization: authHeader(serverKey) },
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new HttpError(502, `Cek status Midtrans gagal: HTTP ${r.status}`);
    return body; // status_code '404' jika transaksi belum pernah dibayar/dipilih
  }

  // ---------- Terapkan status ke Firestore (idempoten) ----------
  // st: respons status Midtrans (sudah terpercaya karena diambil langsung dengan server key).
  // Mengembalikan data payment terbaru; notifikasi dikirim hanya jika status berubah.
  async function applyStatus(orderId, st) {
    const payRef = paymentsCol.doc(orderId);
    const result = await db.runTransaction(async (t) => {
      const paySnap = await t.get(payRef);
      if (!paySnap.exists) return { payment: null, changed: false };
      const payment = paySnap.data();

      // Transaksi belum dibuat di sisi Midtrans (praktikan belum memilih metode).
      if (st.status_code === '404' || !st.transaction_status) return { payment, changed: false };

      // Nominal dari Midtrans harus sama dengan nominal tagihan.
      if (Math.round(Number(st.gross_amount)) !== Math.round(Number(payment.nominal))) {
        throw new HttpError(409, `Nominal tidak cocok untuk ${orderId}`);
      }

      const next = mapMidtransStatus(st.transaction_status, st.fraud_status);
      const nowIso = new Date().toISOString();
      const updated = {
        ...payment,
        midtransStatus: st.transaction_status,
        paymentType: st.payment_type ?? payment.paymentType ?? null,
        transaksiPada: midtransTimeToIso(st.transaction_time) ?? payment.transaksiPada ?? null,
        diperbaruiPada: nowIso,
      };

      if (!shouldApply(payment.status, next)) {
        // Status sama: cukup perbarui detail (mis. payment_type) tanpa notifikasi.
        if (payment.status !== 'SUCCESS') t.update(payRef, {
          midtransStatus: updated.midtransStatus,
          paymentType: updated.paymentType,
          transaksiPada: updated.transaksiPada,
          diperbaruiPada: nowIso,
        });
        return { payment: payment.status === 'SUCCESS' ? payment : updated, changed: false };
      }

      updated.status = next;
      const fineRef = finesCol.doc(payment.fineId);
      const fineSnap = await t.get(fineRef);

      t.update(payRef, {
        status: next,
        midtransStatus: updated.midtransStatus,
        paymentType: updated.paymentType,
        transaksiPada: updated.transaksiPada,
        diperbaruiPada: nowIso,
      });

      if (fineSnap.exists) {
        const fine = fineSnap.data();
        if (next === 'SUCCESS' && fine.status !== 'LUNAS') {
          t.update(fineRef, {
            status: 'LUNAS',
            dibayarPada: updated.transaksiPada ?? nowIso,
            paymentOrderId: orderId,
          });
        } else if (next !== 'SUCCESS' && fine.status !== 'LUNAS' && fine.paymentOrderId === orderId) {
          // Hanya order terakhir yang boleh mengubah status tagihan.
          t.update(fineRef, { status: fineStatusFor(next) });
        }
      }
      return { payment: updated, changed: true };
    });

    if (result.changed) {
      const n = fromPaymentResult(result.payment, orderId);
      if (n) deliver(n);
    }
    return result.payment;
  }

  // ---------- Handler ----------
  async function handleCreate(req, res) {
    const uid = await requireUser(req);
    const { fineId } = await readJson(req);
    if (!fineId || typeof fineId !== 'string') throw new HttpError(400, 'fineId wajib diisi');

    const fineRef = finesCol.doc(fineId);
    const fineSnap = await fineRef.get();
    if (!fineSnap.exists) throw new HttpError(404, 'Tagihan tidak ditemukan');
    const fine = fineSnap.data();
    if (fine.praktikanId !== uid) throw new HttpError(403, 'Tagihan ini bukan milikmu');
    if (fine.status === 'LUNAS') throw new HttpError(409, 'Tagihan sudah lunas');

    // Pakai ulang transaksi PENDING yang belum kedaluwarsa (hindari order ganda).
    if (fine.paymentOrderId) {
      const oldSnap = await paymentsCol.doc(fine.paymentOrderId).get();
      if (oldSnap.exists) {
        const old = oldSnap.data();
        const age = Date.now() - new Date(old.dibuatPada).getTime();
        if (old.status === 'PENDING' && age < (EXPIRY_MINUTES - 5) * 60 * 1000) {
          return send(res, 200, { orderId: fine.paymentOrderId, redirectUrl: old.redirectUrl, reused: true });
        }
      }
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const user = userSnap.exists ? userSnap.data() : {};

    const orderId = makeOrderId(fine);
    const payload = buildSnapPayload({
      orderId,
      fine,
      customer: { nama: user.nama, email: user.email },
      finishUrl: 'assist://pembayaran',
      expiryMinutes: EXPIRY_MINUTES,
    });
    const snap = await midtransCreate(payload);

    const nowIso = new Date().toISOString();
    const payment = {
      fineId,
      praktikanId: uid,
      sessionId: fine.sessionId,
      praktikum: fine.praktikum ?? '',
      pertemuan: fine.pertemuan ?? 0,
      nominal: payload.transaction_details.gross_amount,
      status: 'PENDING',
      midtransStatus: 'pending',
      paymentType: null,
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
      tagihanPada: fine.dibuatPada ?? nowIso,
      dibuatPada: nowIso,
      transaksiPada: null,
      diperbaruiPada: nowIso,
    };

    const batch = db.batch();
    batch.set(paymentsCol.doc(orderId), payment);
    batch.update(fineRef, { status: 'MENUNGGU_PEMBAYARAN', paymentOrderId: orderId });
    await batch.commit();

    console.log(`[PAYMENT] order ${orderId} dibuat untuk tagihan ${fineId}`);
    send(res, 200, { orderId, redirectUrl: snap.redirect_url, reused: false });
  }

  async function handleStatus(req, res, orderId) {
    const uid = await requireUser(req);
    const snap = await paymentsCol.doc(orderId).get();
    if (!snap.exists) throw new HttpError(404, 'Transaksi tidak ditemukan');
    if (snap.data().praktikanId !== uid) throw new HttpError(403, 'Transaksi ini bukan milikmu');

    const st = await midtransStatus(orderId);
    const payment = await applyStatus(orderId, st);
    send(res, 200, { orderId, status: payment.status, midtransStatus: payment.midtransStatus });
  }

  async function handleNotification(req, res) {
    const notif = await readJson(req);
    if (!verifySignature(notif, serverKey)) {
      console.warn('[WEBHOOK] signature tidak valid, diabaikan:', notif.order_id);
      throw new HttpError(403, 'Signature tidak valid');
    }
    // Jangan percaya isi webhook mentah-mentah: ambil status resmi langsung dari Midtrans.
    const st = await midtransStatus(notif.order_id);
    const payment = await applyStatus(notif.order_id, st);
    console.log(
      `[WEBHOOK] ${notif.order_id}: ${st.transaction_status} → ${payment ? payment.status : 'order tidak dikenal (diabaikan)'}`,
    );
    send(res, 200, { ok: true }); // 2xx agar Midtrans berhenti mengirim ulang
  }

  // ---------- Router ----------
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return send(res, 200, { ok: true, notificationUrl: notificationUrl || null });
      }
      if (req.method === 'POST' && url.pathname === '/payment/create') return await handleCreate(req, res);
      if (req.method === 'POST' && url.pathname === '/payment/notification') return await handleNotification(req, res);
      const m = url.pathname.match(/^\/payment\/status\/([A-Za-z0-9\-_~.]{1,50})$/);
      if (req.method === 'GET' && m) return await handleStatus(req, res, m[1]);
      send(res, 404, { error: 'Endpoint tidak ada' });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error(`[PAYMENT] ${req.method} ${url.pathname} gagal:`, e.message);
      send(res, status, { error: e.message });
    }
  });
}

// Simpan URL publik server ke Firestore agar aplikasi tidak perlu di-build ulang saat URL berganti.
async function publishConfig(db, publicUrl) {
  await db.collection('config').doc('payment').set({
    apiUrl: publicUrl.replace(/\/+$/, ''),
    diperbaruiPada: new Date().toISOString(),
  });
}

module.exports = { createPaymentServer, publishConfig };