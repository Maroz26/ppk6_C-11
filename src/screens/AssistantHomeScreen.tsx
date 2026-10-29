import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { useApp } from '../context/AppContext';
import { USER_ENROLLMENTS } from '../data/dummyData';
import { colors } from '../theme/colors';

type StatusKey = 'BELUM_DIBUKA' | 'DIBUKA' | 'DITUTUP';

const STATS: {
  key: StatusKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'BELUM_DIBUKA', label: 'Belum Dibuka', icon: 'time-outline' },
  { key: 'DIBUKA', label: 'Sedang Dibuka', icon: 'lock-open-outline' },
  { key: 'DITUTUP', label: 'Ditutup', icon: 'lock-closed-outline' },
];

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
      (a, b) =>
        new Date(`${a.tanggal}T${a.jamMulai}`).getTime() -
        new Date(`${b.tanggal}T${b.jamMulai}`).getTime()
    );

  const counts: Record<StatusKey, number> = {
    BELUM_DIBUKA: sortedSessions.filter(s => s.status === 'BELUM_DIBUKA').length,
    DIBUKA: sortedSessions.filter(s => s.status === 'DIBUKA').length,
    DITUTUP: sortedSessions.filter(s => s.status === 'DITUTUP').length,
  };

  const initial = currentUser?.nama?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  const renderHeader = () => (
    <View>
      {/* Header profil */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeLabel}>Selamat bertugas,</Text>
          <Text style={styles.welcomeText} numberOfLines={1}>
            {currentUser?.nama}
          </Text>
          <Text style={styles.subText}>NIM/NIP: {currentUser?.nim}</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.btnLogout, pressed && styles.btnLogoutPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textOnPrimary} />
          <Text style={styles.btnLogoutText}>Keluar</Text>
        </Pressable>
      </View>

      {/* Ringkasan */}
      <Text style={styles.sectionTitle}>Ringkasan Status Sesi</Text>
      <View style={styles.statsContainer}>
        {STATS.map(item => {
          const soft = colors.statusSoft[item.key];
          return (
            <View key={item.key} style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: soft.bg }]}>
                <Ionicons name={item.icon} size={18} color={soft.text} />
              </View>
              <Text style={[styles.statNumber, { color: soft.text }]}>{counts[item.key]}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Daftar Sesi Praktikum Diampu</Text>
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
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/sesi/${item.id}`)}
            footer={
              <View style={styles.cardFooter}>
                <Pressable
                  style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
                  onPress={() => router.push(`/kelola/${item.id}`)}
                >
                  <Ionicons name="settings-outline" size={16} color={colors.primary} />
                  <Text style={styles.btnTextSecondary}>Kelola Sesi</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
                  onPress={() => router.push(`/rekap/${item.id}`)}
                >
                  <Ionicons name="bar-chart-outline" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.btnTextPrimary}>Lihat Rekap</Text>
                </Pressable>
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

  // Section
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },

  // Stats
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  // Footer tombol di SessionCard
  cardFooter: { flexDirection: 'row', gap: 8 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnPrimaryPressed: { backgroundColor: colors.primaryDark },
  btnTextPrimary: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnPressed: { backgroundColor: colors.primaryLight },
  btnTextSecondary: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});