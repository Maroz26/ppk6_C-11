import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { formatJamDetik, formatTanggal } from '@/utils/formatTime';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, role, currentUser, hasAttended, getAttendanceBySession } = useApp();
  
  const session = sessions.find(s => s.id === id);

  if (!session) return <EmptyState title="Sesi tidak ditemukan" />;

  const isAttended = currentUser ? hasAttended(session.id, currentUser.id) : false;
  const userAttendance = currentUser ? getAttendanceBySession(session.id).find(a => a.praktikanId === currentUser.id) : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{session.praktikum} - Kelas {session.kelas}</Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={styles.subtitle}>Pertemuan {session.pertemuan}: {session.materi}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.detail}>Tanggal: {formatTanggal(session.tanggal)}</Text>
        <Text style={styles.detail}>Waktu: {session.jamMulai} - {session.jamSelesai}</Text>
        <Text style={styles.detail}>Ruang: {session.ruang}</Text>
        
        {session.dibukaPada && <Text style={styles.detailInfo}>Dibuka pada: {formatJamDetik(session.dibukaPada)}</Text>}
        {session.ditutupPada && <Text style={styles.detailInfo}>Ditutup pada: {formatJamDetik(session.ditutupPada)}</Text>}
      </View>

      <View style={styles.actionSection}>
        {role === 'ASISTEN' ? (
          <>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push(`/kelola/${session.id}`)}>
              <Text style={styles.btnText}>Kelola Sesi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push(`/rekap/${session.id}`)}>
              <Text style={styles.btnTextSecondary}>Lihat Rekap</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {session.status === 'BELUM_DIBUKA' && <Text style={styles.infoCenter}>Sesi belum dibuka.</Text>}
            {session.status === 'DITUTUP' && <Text style={styles.errorCenter}>Sesi sudah ditutup.</Text>}
            {session.status === 'DIBUKA' && !isAttended && (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/praktikan')}>
                <Text style={styles.btnText}>Presensi Sekarang</Text>
              </TouchableOpacity>
            )}
            {isAttended && userAttendance && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Kamu sudah presensi pukul {formatJamDetik(userAttendance.waktu)}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  detail: { fontSize: 14, marginBottom: 6, color: colors.text },
  detailInfo: { fontSize: 12, fontStyle: 'italic', color: colors.textSecondary, marginTop: 4 },
  actionSection: { marginTop: 24 },
  btnPrimary: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  btnSecondary: { backgroundColor: 'white', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnTextSecondary: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  infoCenter: { textAlign: 'center', color: colors.textSecondary, fontSize: 16 },
  errorCenter: { textAlign: 'center', color: colors.status.DITUTUP, fontSize: 16 },
  successBox: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.status.DIBUKA },
  successText: { color: '#2E7D32', textAlign: 'center', fontWeight: 'bold' }
});