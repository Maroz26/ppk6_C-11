const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const {
  fromSessionUpdate,
  fromPermissionDecision,
  fromPermissionCreated,
} = require('./notifications');

initializeApp();
const db = getFirestore();
// Sesuaikan region dengan lokasi Firestore (hapus properti region untuk default us-central1).
const OPT = (document) => ({ document, region: 'asia-southeast2' });

const BAD = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Kirim ke daftar uid; token basi otomatis dibersihkan.
async function sendToUsers({ recipients, title, body, data }) {
  const unique = [...new Set(recipients)].filter(Boolean);
  if (!unique.length) return;

  const snaps = await db.getAll(...unique.map((u) => db.collection('users').doc(u)));
  const entries = [];
  snaps.forEach((s) =>
    (s.data()?.fcmTokens ?? []).forEach((t) => entries.push({ uid: s.id, token: t })),
  );
  if (!entries.length) return; // penerima belum punya token (izin ditolak / belum login)

  for (let i = 0; i < entries.length; i += 500) {
    const chunk = entries.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: chunk.map((e) => e.token),
      notification: { title, body },
      data, // semua value harus string
      android: { priority: 'high' },
    });
    await Promise.all(
      res.responses.map((r, idx) =>
        !r.success && BAD.includes(r.error?.code)
          ? db.collection('users').doc(chunk[idx].uid)
              .update({ fcmTokens: FieldValue.arrayRemove(chunk[idx].token) })
          : null,
      ),
    );
  }
}

const getSession = async (id) => {
  const s = await db.collection('sessions').doc(id).get();
  return s.exists ? s.data() : null;
};

// Sesi dibuka + jadwal berubah → praktikan terdaftar
exports.onSessionUpdated = onDocumentUpdated(OPT('sessions/{sessionId}'), async (event) => {
  const list = fromSessionUpdate(
    event.data.before.data(),
    event.data.after.data(),
    event.params.sessionId,
  );
  for (const n of list) await sendToUsers(n);
});

// Izin disetujui / ditolak → praktikan pemilik izin
exports.onPermissionDecided = onDocumentUpdated(OPT('permissions/{permId}'), async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;
  const n = fromPermissionDecision(before, after, await getSession(after.sessionId), event.params.permId);
  if (n) await sendToUsers(n);
});

// Izin baru → asisten pembuat sesi
exports.onPermissionCreated = onDocumentCreated(OPT('permissions/{permId}'), async (event) => {
  const p = event.data.data();
  const n = fromPermissionCreated(p, await getSession(p.sessionId), event.params.permId);
  if (n) await sendToUsers(n);
});
