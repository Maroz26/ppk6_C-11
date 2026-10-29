import { AttendanceAction } from '@/components/AttendanceAction';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { formatJamDetik, formatTanggal } from '@/utils/formatTime';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={styles.infoBody}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, role, currentUser, hasAttended, getAttendanceBySession } = useApp();

  const session = sessions.find(s => s.id === id);

  if (!session) return <EmptyState title="Sesi tidak ditemukan" />;

  const isAttended = currentUser ? hasAttended(session.id, currentUser.id) : false;
  const userAttendance = currentUser
    ? getAttendanceBySession(session.id).find(a => a.praktikanId === currentUser.id)
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Kartu utama */}
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.pertemuanChip}>
            <Text style={styles.pertemuanText}>Pertemuan {session.pertemuan}</Text>
          </View>
          <StatusBadge status={session.status} />
        </View>

        <Text style={styles.title}>
          {session.praktikum} - Kelas {session.kelas}
        </Text>
        <Text style={styles.subtitle}>{session.materi}</Text>

        <View style={styles.divider} />

        <InfoRow icon="calendar-outline" label="Tanggal" value={formatTanggal(session.tanggal)} />
        <InfoRow icon="time-outline" label="Waktu" value={`${session.jamMulai} - ${session.jamSelesai}`} />
        <InfoRow icon="location-outline" label="Ruang" value={session.ruang} />

        {(session.dibukaPada || session.ditutupPada) && (
          <View style={styles.logBox}>
            {session.dibukaPada && (
              <View style={styles.logRow}>
                <Ionicons name="lock-open-outline" size={14} color={colors.statusSoft.DIBUKA.text} />
                <Text style={styles.logText}>Dibuka pada {formatJamDetik(session.dibukaPada)}</Text>
              </View>
            )}
            {session.ditutupPada && (
              <View style={styles.logRow}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.statusSoft.DITUTUP.text} />
                <Text style={styles.logText}>Ditutup pada {formatJamDetik(session.ditutupPada)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Aksi */}
      <View style={styles.actionSection}>
        {role === 'ASISTEN' ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
              onPress={() => router.push(`/kelola/${session.id}`)}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textOnPrimary} />
              <Text style={styles.btnText}>Kelola Sesi</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
              onPress={() => router.push(`/rekap/${session.id}`)}
            >
              <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
              <Text style={styles.btnTextSecondary}>Lihat Rekap</Text>
            </Pressable>
          </>
        ) : (
          <>
            {session.status === 'BELUM_DIBUKA' && (
              <View style={[styles.notice, { backgroundColor: colors.statusSoft.BELUM_DIBUKA.bg }]}>
                <Ionicons name="time-outline" size={20} color={colors.statusSoft.BELUM_DIBUKA.text} />
                <Text style={[styles.noticeText, { color: colors.statusSoft.BELUM_DIBUKA.text }]}>
                  Sesi belum dibuka.
                </Text>
              </View>
            )}
            {session.status === 'DITUTUP' && (
              <View style={[styles.notice, { backgroundColor: colors.statusSoft.DITUTUP.bg }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.statusSoft.DITUTUP.text} />
                <Text style={[styles.noticeText, { color: colors.statusSoft.DITUTUP.text }]}>
                  Sesi sudah ditutup.
                </Text>
              </View>
            )}
            {session.status === 'DIBUKA' && <AttendanceAction session={session} />}
            {isAttended && userAttendance && (
              <View style={[styles.notice, { backgroundColor: colors.statusSoft.DIBUKA.bg }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.statusSoft.DIBUKA.text} />
                <Text style={[styles.noticeText, { color: colors.statusSoft.DIBUKA.text }]}>
                  Kamu sudah presensi pukul {formatJamDetik(userAttendance.waktu)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },

  // Kartu
  card: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pertemuanChip: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pertemuanText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.textSecondary },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 1 },

  // Log buka/tutup
  logBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    gap: 6,
  },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logText: { fontSize: 12, color: colors.textSecondary },

  // Aksi
  actionSection: { marginTop: 20 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 12,
  },
  btnPrimaryPressed: { backgroundColor: colors.primaryDark },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  btnSecondaryPressed: { backgroundColor: colors.primaryLight },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  btnTextSecondary: { color: colors.primary, fontWeight: '700', fontSize: 16 },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  noticeText: { fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
});
