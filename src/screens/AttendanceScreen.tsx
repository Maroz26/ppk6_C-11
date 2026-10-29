import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
      (a, b) =>
        new Date(`${a.tanggal}T${a.jamMulai}`).getTime() -
        new Date(`${b.tanggal}T${b.jamMulai}`).getTime()
    );

  const initial = currentUser?.nama?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeLabel}>Halo,</Text>
          <Text style={styles.welcomeText} numberOfLines={1}>
            {currentUser?.nama}
          </Text>
          <Text style={styles.subText}>NIM: {currentUser?.nim}</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.btnLogout, pressed && styles.btnLogoutPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textOnPrimary} />
          <Text style={styles.btnLogoutText}>Keluar</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Daftar Sesi Praktikum</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedSessions}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isAttended = currentUser ? hasAttended(item.id, currentUser.id) : false;

          return (
            <SessionCard
              session={item}
              onPress={() => router.push(`/sesi/${item.id}`)}
              footer={
                <View style={styles.cardFooter}>
                  {item.status === 'DIBUKA' && !isAttended && (
                    <Pressable
                      style={({ pressed }) => [styles.btnPresensi, pressed && styles.btnPresensiPressed]}
                      onPress={() => router.push(`/sesi/${item.id}`)}
                    >
                      <Ionicons name="finger-print-outline" size={18} color={colors.textOnPrimary} />
                      <Text style={styles.btnPresensiText}>Presensi Sekarang</Text>
                    </Pressable>
                  )}

                  {item.status === 'DIBUKA' && isAttended && (
                    <View style={[styles.badge, { backgroundColor: colors.statusSoft.DIBUKA.bg }]}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.statusSoft.DIBUKA.text} />
                      <Text style={[styles.badgeText, { color: colors.statusSoft.DIBUKA.text }]}>
                        Sudah Presensi
                      </Text>
                    </View>
                  )}

                  {item.status === 'BELUM_DIBUKA' && (
                    <View style={[styles.badge, { backgroundColor: colors.statusSoft.BELUM_DIBUKA.bg }]}>
                      <Ionicons name="time-outline" size={16} color={colors.statusSoft.BELUM_DIBUKA.text} />
                      <Text style={[styles.badgeText, { color: colors.statusSoft.BELUM_DIBUKA.text }]}>
                        Sesi Belum Dibuka
                      </Text>
                    </View>
                  )}

                  {item.status === 'DITUTUP' && (
                    <View style={[styles.badge, { backgroundColor: colors.statusSoft.DITUTUP.bg }]}>
                      <Ionicons name="lock-closed-outline" size={16} color={colors.statusSoft.DITUTUP.text} />
                      <Text style={[styles.badgeText, { color: colors.statusSoft.DITUTUP.text }]}>
                        Sesi Sudah Ditutup
                      </Text>
                    </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.textOnPrimary },
  userInfo: { flex: 1, marginRight: 8 },
  welcomeLabel: { fontSize: 12, color: colors.primaryLight },
  welcomeText: { fontSize: 17, fontWeight: '700', color: colors.textOnPrimary, marginTop: 1 },
  subText: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  btnLogoutPressed: { backgroundColor: 'rgba(255,255,255,0.32)' },
  btnLogoutText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },

  // Footer di SessionCard
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  btnPresensi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPresensiPressed: { backgroundColor: colors.primaryDark },
  btnPresensiText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
});