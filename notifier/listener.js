// Pengirim notifikasi tanpa Cloud Functions (paket Spark / gratis).
// Memantau Firestore dari laptop dan mengirim FCM lewat Firebase Admin SDK.
// Logika "siapa menerima apa" memakai ../functions/notifications.js dan ../functions/payment.js
// (sama dengan yang diuji).
// Sprint 4: sekaligus menjalankan server pembayaran Midtrans (paymentServer.js).
const path = require('path');
const fs = require('fs');

// ---------- Konfigurasi (.env) ----------
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath); // Node 20.12+ / 22
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const PAYMENT_PORT = Number(process.env.PAYMENT_PORT || 3000);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').trim();

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const {
  fromSessionUpdate,
  fromPermissionDecision,
  fromPermissionCreated,
} = require('../functions/notifications');
const { fromFineCreated } = require('../functions/payment');
const { createPaymentServer, publishConfig } = require('./paymentServer');

// ---------- Kredensial ----------
const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(keyPath);
} catch {
  console.error(`File kunci tidak ditemukan: ${keyPath}`);
  console.error('Unduh dari Firebase Console → Project settings → Service accounts → Generate new private key,');
  console.error('lalu simpan sebagai notifier/serviceAccountKey.json');
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ---------- Pengiriman ----------
const BAD = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Buang nilai kosong dan ubah semua nilai jadi string (syarat payload data FCM).
const toStringData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );

async function sendToUsers({ recipients, title, body, data }) {
  const unique = [...new Set(recipients)].filter(Boolean);
  if (!unique.length) return { tokens: 0, sent: 0 };

  const snaps = await db.getAll(...unique.map((u) => db.collection('users').doc(u)));
  const entries = [];
  snaps.forEach((s) =>
    (s.data()?.fcmTokens ?? []).forEach((t) => entries.push({ uid: s.id, token: t })),
  );
  if (!entries.length) return { tokens: 0, sent: 0 }; // penerima belum punya token

  let sent = 0;
  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: chunk.map((e) => e.token),
      notification: { title, body },
      data: toStringData(data), // FCM wajib string; dipakai aplikasi untuk membuka halaman terkait
      android: { priority: 'high', notification: { channelId: 'assist-high' } },
    });
    sent += res.successCount;
    await Promise.all(
      res.responses.map((r, idx) =>
        !r.success && BAD.includes(r.error?.code)
          ? db.collection('users').doc(chunk[idx].uid)
              .update({ fcmTokens: FieldValue.arrayRemove(chunk[idx].token) })
          : null,
      ),
    );
  }
  return { tokens: entries.length, sent };
}

async function deliver(n) {
  try {
    const r = await sendToUsers(n);
    console.log(`[${n.data.type}] ${n.title} → ${n.recipients.length} penerima, ${r.sent}/${r.tokens} token terkirim`);
  } catch (e) {
    console.error(`[${n.data.type}] gagal kirim:`, e.message);
  }
}

// ---------- Pantau Firestore ----------
// onSnapshot hanya memberi data terbaru, jadi data sebelumnya disimpan di cache
// untuk membandingkan before/after. Snapshot pertama hanya mengisi cache (tanpa kirim).
const sessionsCache = new Map();
const permissionsCache = new Map();

async function getSession(id) {
  if (sessionsCache.has(id)) return sessionsCache.get(id);
  const s = await db.collection('sessions').doc(id).get();
  return s.exists ? s.data() : null;
}

let sessionsReady = false;
db.collection('sessions').onSnapshot(
  (snap) => {
    snap.docChanges().forEach((ch) => {
      const id = ch.doc.id;
      if (ch.type === 'removed') return void sessionsCache.delete(id);
      const after = ch.doc.data();
      const before = sessionsCache.get(id);
      sessionsCache.set(id, after);
      if (!sessionsReady || !before) return;
      fromSessionUpdate(before, after, id).forEach(deliver);
    });
    sessionsReady = true;
  },
  (e) => console.error('Listener sessions error:', e.message),
);

let permissionsReady = false;
db.collection('permissions').onSnapshot(
  (snap) => {
    snap.docChanges().forEach(async (ch) => {
      const id = ch.doc.id;
      if (ch.type === 'removed') return void permissionsCache.delete(id);
      const after = ch.doc.data();
      const before = permissionsCache.get(id);
      permissionsCache.set(id, after);
      if (!permissionsReady) return;
      try {
        const n = before
          ? fromPermissionDecision(before, after, await getSession(after.sessionId), id)
          : fromPermissionCreated(after, await getSession(after.sessionId), id);
        if (n) deliver(n);
      } catch (e) {
        console.error('Proses izin gagal:', e.message);
      }
    });
    permissionsReady = true;
  },
  (e) => console.error('Listener permissions error:', e.message),
);

// Sprint 4: tagihan denda baru (dibuat billingService P2) → notifikasi ke praktikan.
// Hanya dokumen yang BARU muncul setelah notifier berjalan yang dikirimi notifikasi.
let finesReady = false;
db.collection('fines').onSnapshot(
  (snap) => {
    if (finesReady) {
      snap.docChanges().forEach((ch) => {
        if (ch.type !== 'added') return;
        const n = fromFineCreated(ch.doc.data(), ch.doc.id);
        if (n) deliver(n);
      });
    }
    finesReady = true;
  },
  (e) => console.error('Listener fines error:', e.message),
);

// ---------- Server pembayaran ----------
if (!MIDTRANS_SERVER_KEY) {
  console.warn('MIDTRANS_SERVER_KEY kosong di notifier/.env → server pembayaran TIDAK dijalankan.');
} else {
  const server = createPaymentServer({
    db,
    auth: getAuth(),
    deliver,
    env: { serverKey: MIDTRANS_SERVER_KEY, isProduction: MIDTRANS_IS_PRODUCTION, publicUrl: PUBLIC_URL },
  });
  server.listen(PAYMENT_PORT, async () => {
    console.log(`Server pembayaran (Midtrans ${MIDTRANS_IS_PRODUCTION ? 'PRODUCTION' : 'Sandbox'}) di http://localhost:${PAYMENT_PORT}`);
    if (!PUBLIC_URL) {
      console.warn('PUBLIC_URL kosong → webhook Midtrans tidak bisa sampai. Isi dengan URL tunnel lalu restart.');
      return;
    }
    try {
      await publishConfig(db, PUBLIC_URL);
      console.log(`URL publik ${PUBLIC_URL} disimpan ke config/payment`);
    } catch (e) {
      console.error('Gagal menyimpan config/payment:', e.message);
    }
  });
}

console.log('Notifier berjalan. Biarkan jendela ini terbuka selama demo. Ctrl+C untuk berhenti.');