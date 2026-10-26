import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { useApp } from '../context/AppContext';
import { USER_ENROLLMENTS } from '../data/dummyData';
import { colors } from '../theme/colors';

export default function AttendanceScreen() {
  const { currentUser, sessions, hasAttended, logout } = useApp();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const userSessionIds = currentUser ? USER_ENROLLMENTS[currentUser.id] || [] : [];
  const sortedSessions = sessions
    .filter(s => userSessionIds.includes(s.id))
    .sort(
      (a, b) => new Date(`${a.tanggal}T${a.jamMulai}`).getTime() - new Date(`${b.tanggal}T${b.jamMulai}`).getTime()
    );

  return (
    <View style={styles.container}>
      {/* Header Info Praktikan + Tombol Log Out */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Halo, {currentUser?.nama} 👋</Text>
            <Text style={styles.subText}>NIM: {currentUser?.nim}</Text>
          </View>
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={styles.btnLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Daftar Sesi Praktikum</Text>

      <FlatList
        data={sortedSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => {
          const isAttended = currentUser ? hasAttended(item.id, currentUser.id) : false;
          
          return (
            <SessionCard
              session={item}
              onPress={() => router.push(`/sesi/${item.id}`)}
              footer={
                <View style={styles.cardFooter}>
                  {item.status === 'DIBUKA' && !isAttended && (
                    <TouchableOpacity 
                      style={styles.btnPresensi}
                      onPress={() => router.push(`/sesi/${item.id}`)}
                    >
                      <Text style={styles.btnPresensiText}>Presensi Sekarang</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'DIBUKA' && isAttended && (
                    <Text style={styles.statusDone}>✓ Sudah Presensi</Text>
                  )}

                  {item.status === 'BELUM_DIBUKA' && (
                    <Text style={styles.statusInfo}>Sesi Belum Dibuka</Text>
                  )}

                  {item.status === 'DITUTUP' && (
                    <Text style={styles.statusClosed}>Sesi Sudah Ditutup</Text>
                  )}
                </View>
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Tidak Ada Jadwal"
            desc="Belum ada jadwal praktikum yang Anda ikuti saat ini."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  welcomeText: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  subText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  btnLogout: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.status.DITUTUP, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnLogoutText: { color: colors.status.DITUTUP, fontWeight: 'bold', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btnPresensi: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnPresensiText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  statusDone: { color: colors.status.DIBUKA, fontWeight: 'bold', fontSize: 14 },
  statusInfo: { color: colors.textSecondary, fontSize: 14, fontStyle: 'italic' },
  statusClosed: { color: colors.status.DITUTUP, fontSize: 14 }
});