import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { useApp } from '../context/AppContext';
import { USER_ENROLLMENTS } from '../data/dummyData';
import { colors } from '../theme/colors';

export default function AssistantHomeScreen() {
  const { currentUser, sessions, logout } = useApp();

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

  const totalBelumDibuka = sortedSessions.filter(s => s.status === 'BELUM_DIBUKA').length;
  const totalDibuka = sortedSessions.filter(s => s.status === 'DIBUKA').length;
  const totalDitutup = sortedSessions.filter(s => s.status === 'DITUTUP').length;

  return (
    <View style={styles.container}>
      {/* Header Info Asisten + Tombol Log Out */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Selamat Bertugas, {currentUser?.nama} 👨‍🏫</Text>
            <Text style={styles.subText}>NIM/NIP: {currentUser?.nim}</Text>
          </View>
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <Text style={styles.btnLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ringkasan Status Sesi Anda</Text>
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { borderColor: colors.status.BELUM_DIBUKA }]}>
          <Text style={styles.statNumber}>{totalBelumDibuka}</Text>
          <Text style={styles.statLabel}>Belum Dibuka</Text>
        </View>
        <View style={[styles.statBox, { borderColor: colors.status.DIBUKA }]}>
          <Text style={[styles.statNumber, { color: colors.status.DIBUKA }]}>{totalDibuka}</Text>
          <Text style={styles.statLabel}>Sedang Dibuka</Text>
        </View>
        <View style={[styles.statBox, { borderColor: colors.status.DITUTUP }]}>
          <Text style={[styles.statNumber, { color: colors.status.DITUTUP }]}>{totalDitutup}</Text>
          <Text style={styles.statLabel}>Ditutup</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Daftar Sesi Praktikum Diampu</Text>
      <FlatList
        data={sortedSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/sesi/${item.id}`)}
            footer={
              <View style={styles.cardFooter}>
                <TouchableOpacity 
                  style={styles.btnActionSecondary}
                  onPress={() => router.push(`/kelola/${item.id}`)}
                >
                  <Text style={styles.btnTextSecondary}>Kelola Sesi</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnActionPrimary}
                  onPress={() => router.push(`/rekap/${item.id}`)}
                >
                  <Text style={styles.btnTextPrimary}>Lihat Rekap</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="📋"
            title="Tidak Ada Sesi"
            desc="Belum ada jadwal praktikum yang Anda ampu."
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
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btnActionPrimary: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  btnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  btnActionSecondary: { backgroundColor: 'white', borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  btnTextSecondary: { color: colors.text, fontWeight: 'bold', fontSize: 13 }
});