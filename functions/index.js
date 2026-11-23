const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
// Sesuaikan region dengan lokasi Firestore (hapus properti region untuk default us-central1).
const OPT = (document) => ({ document, region: 'asia-southeast2' });

const BAD = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Kirim ke daftar uid; token basi otomatis dibersihkan.
async function sendToUsers(uids, { title, body, data }) {
  const unique = [...new Set(uids)].filter(Boolean);
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

// Sesi dibuka + jadwal berubah → praktikan terdaftar
exports.onSessionUpdated = onDocumentUpdated(OPT('sessions/{sessionId}'), async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const sessionId = event.params.sessionId;
  const students = after.enrolledStudents ?? [];
  const label = `${after.praktikum} - Pertemuan ${after.pertemuan}`;

  if (before.status === 'BELUM_DIBUKA' && after.status === 'DIBUKA') {
    await sendToUsers(students, {
      title: 'Sesi presensi dibuka',
      body: `${label} sudah dibuka. Segera lakukan presensi.`,
      data: { type: 'SESSION_OPENED', sessionId },
    });
  }

  const changed = ['tanggal', 'jamMulai', 'jamSelesai', 'ruang'].filter((k) => before[k] !== after[k]);
  if (changed.length) {
    await sendToUsers(students, {
      title: 'Jadwal praktikum berubah',
      body: `${label}: ${after.tanggal} ${after.jamMulai}-${after.jamSelesai}, ruang ${after.ruang}.`,
      data: { type: 'SCHEDULE_CHANGED', sessionId },
    });
  }
});

// Izin disetujui / ditolak → praktikan pemilik izin
exports.onPermissionDecided = onDocumentUpdated(OPT('permissions/{permId}'), async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status !== 'MENUNGGU' || !['DITERIMA', 'DITOLAK'].includes(after.status)) return;

  const s = await db.collection('sessions').doc(after.sessionId).get();
  const label = s.exists ? `${s.data().praktikum} - Pertemuan ${s.data().pertemuan}` : 'sesi praktikum';
  const diterima = after.status === 'DITERIMA';

  await sendToUsers([after.praktikanId], {
    title: diterima ? 'Izin disetujui' : 'Izin ditolak',
    body: `Pengajuan izin untuk ${label} ${diterima ? 'disetujui' : 'ditolak'}.`,
    data: { type: 'PERMISSION_DECIDED', sessionId: after.sessionId, permissionId: event.params.permId },
  });
});

// Izin baru → asisten pembuat sesi
exports.onPermissionCreated = onDocumentCreated(OPT('permissions/{permId}'), async (event) => {
  const p = event.data.data();
  const s = await db.collection('sessions').doc(p.sessionId).get();
  if (!s.exists) return;
  await sendToUsers([s.data().dibuatOleh], {
    title: 'Pengajuan izin baru',
    body: `${p.nama} (${p.nim}) mengajukan izin.`,
    data: { type: 'PERMISSION_NEW', sessionId: p.sessionId, permissionId: event.params.permId },
  });
});
