const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fromSessionUpdate,
  fromPermissionDecision,
  fromPermissionCreated,
} = require('../notifications');

// Di data asli, semua id pengguna adalah uid Firebase Auth (bukan nama).
const ASISTEN_VIVIANNE = 'Vv1aN3Qx7LmP9zKd4RtB6cYhE2sA';
const ASISTEN_LAIN = 'As9bT2Lm5QzK8vRd1WxY4cHnJ6pE';
const PRAKTIKAN_1 = 'Pk1xQ7mL3aVd9RtB2zKc5YhN8sWe';
const PRAKTIKAN_2 = 'Pk2yR8nM4bWe0SuC3aLd6ZiO9tXf';
const PRAKTIKAN_LUAR = 'Pk3zS9oN5cXf1TvD4bMe7AjP0uYg'; // tidak terdaftar di sesi

// Bentuk sama dengan dokumen sessions/{id} (field `id` tidak disimpan di dokumen).
const session = {
  praktikum: 'Pemrograman Web',
  kelas: 'A',
  pertemuan: 3,
  tanggal: '2026-12-01',
  jamMulai: '08:00',
  jamSelesai: '10:00',
  ruang: 'Lab 1',
  materi: 'Laravel dasar',
  status: 'BELUM_DIBUKA',
  dibukaPada: null,
  ditutupPada: null,
  dibukaOleh: null,
  dibuatOleh: ASISTEN_VIVIANNE,
  enrolledStudents: [PRAKTIKAN_1, PRAKTIKAN_2],
};

test('sesi dibuka → hanya praktikan terdaftar (bukan asisten / praktikan lain)', () => {
  const list = fromSessionUpdate(session, { ...session, status: 'DIBUKA' }, 's1');
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].recipients, [PRAKTIKAN_1, PRAKTIKAN_2]);
  assert.equal(list[0].data.type, 'SESSION_OPENED');
  assert.equal(list[0].data.sessionId, 's1');
  assert.ok(!list[0].recipients.includes(ASISTEN_VIVIANNE));
  assert.ok(!list[0].recipients.includes(PRAKTIKAN_LUAR));
});

test('sesi ditutup → tidak ada notifikasi', () => {
  const opened = { ...session, status: 'DIBUKA' };
  assert.equal(fromSessionUpdate(opened, { ...opened, status: 'DITUTUP' }, 's1').length, 0);
});

test('jadwal berubah (ruang / jam / tanggal) → praktikan terdaftar, isi jadwal baru', () => {
  for (const patch of [{ ruang: 'Lab 2' }, { jamMulai: '09:00' }, { jamSelesai: '11:00' }, { tanggal: '2026-12-02' }]) {
    const after = { ...session, ...patch };
    const list = fromSessionUpdate(session, after, 's1');
    assert.equal(list.length, 1, JSON.stringify(patch));
    assert.equal(list[0].data.type, 'SCHEDULE_CHANGED');
    assert.deepEqual(list[0].recipients, [PRAKTIKAN_1, PRAKTIKAN_2]);
    assert.ok(list[0].body.includes(after.ruang));
  }
});

test('ubah materi / kelas saja → tidak ada notifikasi', () => {
  assert.equal(fromSessionUpdate(session, { ...session, materi: 'baru' }, 's1').length, 0);
  assert.equal(fromSessionUpdate(session, { ...session, kelas: 'B' }, 's1').length, 0);
});

test('buka sesi + ubah jadwal sekaligus → dua notifikasi', () => {
  const list = fromSessionUpdate(session, { ...session, status: 'DIBUKA', ruang: 'Lab 3' }, 's1');
  assert.deepEqual(list.map((n) => n.data.type).sort(), ['SCHEDULE_CHANGED', 'SESSION_OPENED']);
});

// Bentuk sama dengan dokumen permissions/{id}.
const perm = {
  sessionId: 's1',
  praktikanId: PRAKTIKAN_1,
  nama: 'Budi',
  nim: '12345',
  alasan: 'Sakit',
  status: 'MENUNGGU',
  diputuskanOleh: null,
  diputuskanPada: null,
};

test('izin disetujui → hanya praktikan pemilik izin', () => {
  const n = fromPermissionDecision(perm, { ...perm, status: 'DITERIMA' }, session, 'x1');
  assert.deepEqual(n.recipients, [PRAKTIKAN_1]);
  assert.ok(!n.recipients.includes(PRAKTIKAN_2));
  assert.equal(n.title, 'Izin disetujui');
  assert.equal(n.data.type, 'PERMISSION_DECIDED');
});

test('izin ditolak → hanya praktikan pemilik izin, judul berbeda', () => {
  const n = fromPermissionDecision(perm, { ...perm, status: 'DITOLAK' }, session, 'x1');
  assert.deepEqual(n.recipients, [PRAKTIKAN_1]);
  assert.equal(n.title, 'Izin ditolak');
});

test('izin: status tidak berubah dari MENUNGGU → tidak ada notifikasi', () => {
  assert.equal(fromPermissionDecision(perm, { ...perm, alasan: 'edit' }, session, 'x1'), null);
  const decided = { ...perm, status: 'DITERIMA' };
  assert.equal(fromPermissionDecision(decided, { ...decided, status: 'DITOLAK' }, session, 'x1'), null);
});

test('izin dengan sesi yang sudah dihapus → tetap terkirim', () => {
  const n = fromPermissionDecision(perm, { ...perm, status: 'DITERIMA' }, null, 'x1');
  assert.deepEqual(n.recipients, [PRAKTIKAN_1]);
});

test('izin baru → asisten pembuat sesi saja (bukan asisten lain, bukan praktikan)', () => {
  const n = fromPermissionCreated(perm, session, 'x1');
  assert.deepEqual(n.recipients, [ASISTEN_VIVIANNE]);
  assert.ok(!n.recipients.includes(ASISTEN_LAIN));
  assert.equal(n.data.type, 'PERMISSION_NEW');
  assert.equal(fromPermissionCreated(perm, null, 'x1'), null);
});
