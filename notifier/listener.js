// Pengirim notifikasi tanpa Cloud Functions (paket Spark / gratis).
// Memantau Firestore dari laptop dan mengirim FCM lewat Firebase Admin SDK.
// Logika "siapa menerima apa" memakai ../functions/notifications.js (sama dengan yang diuji).
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const {
  fromSessionUpdate,
  fromPermissionDecision,
  fromPermissionCreated,
} = require('../functions/notifications');

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
      data, // semua value harus string
      android: { priority: 'high' },
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

console.log('Notifier berjalan. Biarkan jendela ini terbuka selama demo. Ctrl+C untuk berhenti.');
