// Logika murni: menentukan SIAPA menerima apa. Tidak menyentuh Firebase, jadi bisa diuji.

const label = (s) => `${s.praktikum} - Pertemuan ${s.pertemuan}`;

// Perubahan dokumen sessions → daftar notifikasi (bisa 0, 1, atau 2).
function fromSessionUpdate(before, after, sessionId) {
  const out = [];
  const students = after.enrolledStudents ?? [];

  if (before.status === 'BELUM_DIBUKA' && after.status === 'DIBUKA') {
    out.push({
      recipients: students,
      title: 'Sesi presensi dibuka',
      body: `${label(after)} sudah dibuka. Segera lakukan presensi.`,
      data: { type: 'SESSION_OPENED', sessionId },
    });
  }

  const changed = ['tanggal', 'jamMulai', 'jamSelesai', 'ruang'].some((k) => before[k] !== after[k]);
  if (changed) {
    out.push({
      recipients: students,
      title: 'Jadwal praktikum berubah',
      body: `${label(after)}: ${after.tanggal} ${after.jamMulai}-${after.jamSelesai}, ruang ${after.ruang}.`,
      data: { type: 'SCHEDULE_CHANGED', sessionId },
    });
  }
  return out;
}

// Izin diputuskan asisten → praktikan pemilik izin. session boleh null.
function fromPermissionDecision(before, after, session, permissionId) {
  if (before.status !== 'MENUNGGU' || !['DITERIMA', 'DITOLAK'].includes(after.status)) return null;
  const diterima = after.status === 'DITERIMA';
  const name = session ? label(session) : 'sesi praktikum';
  return {
    recipients: [after.praktikanId],
    title: diterima ? 'Izin disetujui' : 'Izin ditolak',
    body: `Pengajuan izin untuk ${name} ${diterima ? 'disetujui' : 'ditolak'}.`,
    data: { type: 'PERMISSION_DECIDED', sessionId: after.sessionId, permissionId },
  };
}

// Izin baru → asisten pembuat sesi.
function fromPermissionCreated(permission, session, permissionId) {
  if (!session) return null;
  return {
    recipients: [session.dibuatOleh],
    title: 'Pengajuan izin baru',
    body: `${permission.nama} (${permission.nim}) mengajukan izin.`,
    data: { type: 'PERMISSION_NEW', sessionId: permission.sessionId, permissionId },
  };
}

module.exports = { fromSessionUpdate, fromPermissionDecision, fromPermissionCreated };
