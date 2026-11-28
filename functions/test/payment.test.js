const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('../payment');

// Key palsu khusus test (bukan key asli).
const SERVER_KEY = 'SB-Mid-server-TESTKEY123';
const PRAKTIKAN = 'Pk1xQ7mL3aVd9RtB2zKc5YhN8sWe';
const SESSION_ID = 'aB3dE5fG7hJ9kL1mN2pQ';

// Bentuk sama dengan dokumen fines/{sessionId}_{uid}.
const fine = {
  praktikanId: PRAKTIKAN,
  nama: 'Silvani',
  nim: '24060120000',
  sessionId: SESSION_ID,
  attendanceId: `${SESSION_ID}_${PRAKTIKAN}`,
  praktikum: 'Pemrograman Web',
  pertemuan: 3,
  nominal: 5000,
  menitTerlambat: 12,
  status: 'BELUM_DIBAYAR',
  dibuatPada: '2026-11-28T03:00:00.000Z',
  dibayarPada: null,
  paymentOrderId: null,
};

// ---------- authHeader ----------
test('authHeader: Basic base64("serverKey:")', () => {
  assert.equal(authHeader('abc'), `Basic ${Buffer.from('abc:').toString('base64')}`);
  assert.throws(() => authHeader(''));
});

// ---------- makeOrderId ----------
test('makeOrderId: <= 50 karakter dan hanya karakter yang diizinkan Midtrans', () => {
  const id = makeOrderId(fine, 1764300000000);
  assert.ok(id.length <= 50, `terlalu panjang: ${id.length}`);
  assert.match(id, /^[A-Za-z0-9\-_~.]+$/);
  assert.equal(id, 'DND-aB3dE5fG-Pk1xQ7-1764300000000');
});

test('makeOrderId: beda waktu → order berbeda (bayar ulang tidak bentrok)', () => {
  assert.notEqual(makeOrderId(fine, 1), makeOrderId(fine, 2));
});

// ---------- buildSnapPayload ----------
test('buildSnapPayload: nominal, item, customer, finish URL', () => {
  const p = buildSnapPayload({
    orderId: 'DND-1',
    fine,
    customer: { nama: 'Silvani S', email: 's@mail.com' },
    finishUrl: 'assist://pembayaran',
  });
  assert.deepEqual(p.transaction_details, { order_id: 'DND-1', gross_amount: 5000 });
  assert.equal(p.item_details[0].price * p.item_details[0].quantity, 5000); // wajib sama dengan gross_amount
  assert.ok(p.item_details[0].name.length <= 50);
  assert.equal(p.customer_details.email, 's@mail.com');
  assert.deepEqual(p.callbacks, { finish: 'assist://pembayaran' });
  assert.deepEqual(p.expiry, { unit: 'minutes', duration: 60 });
});

test('buildSnapPayload: tanpa email/finishUrl tidak menulis field kosong', () => {
  const p = buildSnapPayload({ orderId: 'DND-1', fine });
  assert.equal('email' in p.customer_details, false);
  assert.equal('callbacks' in p, false);
  assert.equal(p.customer_details.first_name, 'Silvani');
});

test('buildSnapPayload: nominal tidak valid ditolak', () => {
  assert.throws(() => buildSnapPayload({ orderId: 'x', fine: { ...fine, nominal: 0 } }));
  assert.throws(() => buildSnapPayload({ orderId: 'x', fine: { ...fine, nominal: 'abc' } }));
});

// ---------- signature ----------
const notif = (over = {}) => {
  const base = {
    order_id: 'DND-aB3dE5fG-Pk1xQ7-1764300000000',
    status_code: '200',
    gross_amount: '5000.00', // Midtrans mengirim string dengan 2 desimal
    transaction_status: 'settlement',
    ...over,
  };
  return { ...base, signature_key: computeSignature(base, SERVER_KEY) };
};

test('verifySignature: signature asli diterima', () => {
  assert.equal(verifySignature(notif(), SERVER_KEY), true);
});

test('verifySignature: data diubah setelah ditandatangani → ditolak', () => {
  const n = notif();
  n.gross_amount = '1.00';
  assert.equal(verifySignature(n, SERVER_KEY), false);
});

test('verifySignature: server key lain / signature kosong → ditolak', () => {
  assert.equal(verifySignature(notif(), 'SB-Mid-server-LAIN'), false);
  assert.equal(verifySignature({ ...notif(), signature_key: undefined }, SERVER_KEY), false);
  assert.equal(verifySignature({ ...notif(), signature_key: 'zz' }, SERVER_KEY), false);
  assert.equal(verifySignature(null, SERVER_KEY), false);
});

// ---------- status ----------
test('mapMidtransStatus: semua status utama', () => {
  assert.equal(mapMidtransStatus('settlement'), 'SUCCESS');
  assert.equal(mapMidtransStatus('capture', 'accept'), 'SUCCESS');
  assert.equal(mapMidtransStatus('capture', 'challenge'), 'PENDING');
  assert.equal(mapMidtransStatus('pending'), 'PENDING');
  for (const s of ['deny', 'cancel', 'expire', 'failure']) {
    assert.equal(mapMidtransStatus(s), 'FAILED', s);
  }
  assert.equal(mapMidtransStatus('status_aneh'), 'PENDING');
});

test('fineStatusFor: gagal mengembalikan tagihan ke BELUM_DIBAYAR', () => {
  assert.equal(fineStatusFor('SUCCESS'), 'LUNAS');
  assert.equal(fineStatusFor('PENDING'), 'MENUNGGU_PEMBAYARAN');
  assert.equal(fineStatusFor('FAILED'), 'BELUM_DIBAYAR');
});

test('shouldApply: SUCCESS final, duplikat diabaikan', () => {
  assert.equal(shouldApply('PENDING', 'SUCCESS'), true);
  assert.equal(shouldApply('PENDING', 'FAILED'), true);
  assert.equal(shouldApply('SUCCESS', 'FAILED'), false); // webhook terlambat tidak menurunkan status
  assert.equal(shouldApply('SUCCESS', 'SUCCESS'), false);
  assert.equal(shouldApply('PENDING', 'PENDING'), false);
});

test('midtransTimeToIso: waktu WIB → ISO UTC', () => {
  assert.equal(midtransTimeToIso('2026-11-28 10:15:00'), '2026-11-28T03:15:00.000Z');
  assert.equal(midtransTimeToIso(undefined), null);
  assert.equal(midtransTimeToIso('bukan tanggal'), null);
});

test('rupiah: format id-ID', () => {
  assert.equal(rupiah(5000), 'Rp5.000');
  assert.equal(rupiah(1250000), 'Rp1.250.000');
});

// ---------- notifikasi ----------
test('fromFineCreated: ke praktikan pemilik tagihan, data string', () => {
  const n = fromFineCreated(fine, `${SESSION_ID}_${PRAKTIKAN}`);
  assert.deepEqual(n.recipients, [PRAKTIKAN]);
  assert.equal(n.title, 'Tagihan denda baru');
  assert.match(n.body, /Pemrograman Web - Pertemuan 3/);
  assert.match(n.body, /Rp5\.000/);
  assert.equal(n.data.type, 'FINE_NEW');
  Object.values(n.data).forEach((v) => assert.equal(typeof v, 'string')); // syarat FCM
  assert.equal(fromFineCreated({}, 'x'), null);
});

const payment = (status, midtransStatus) => ({
  fineId: `${SESSION_ID}_${PRAKTIKAN}`,
  praktikanId: PRAKTIKAN,
  sessionId: SESSION_ID,
  praktikum: 'Pemrograman Web',
  pertemuan: 3,
  nominal: 5000,
  status,
  midtransStatus,
});

test('fromPaymentResult: SUCCESS, FAILED, expire, PENDING', () => {
  const ok = fromPaymentResult(payment('SUCCESS', 'settlement'), 'DND-1');
  assert.equal(ok.title, 'Pembayaran denda berhasil');
  assert.equal(ok.data.type, 'PAYMENT_SUCCESS');
  assert.deepEqual(ok.recipients, [PRAKTIKAN]);

  const fail = fromPaymentResult(payment('FAILED', 'deny'), 'DND-1');
  assert.equal(fail.data.type, 'PAYMENT_FAILED');
  assert.match(fail.body, /gagal/);

  const exp = fromPaymentResult(payment('FAILED', 'expire'), 'DND-1');
  assert.match(exp.body, /kedaluwarsa/);

  assert.equal(fromPaymentResult(payment('PENDING', 'pending'), 'DND-1'), null);
  [ok, fail].forEach((n) => Object.values(n.data).forEach((v) => assert.equal(typeof v, 'string')));
});