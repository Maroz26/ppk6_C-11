// src/screens/AssistantRecapScreen.tsx
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { RecapRow } from '../components/RecapRow';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { USER_ENROLLMENTS } from '../data/dummyData';
import { colors } from '../theme/colors';

export default function AssistantRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, praktikanList, getAttendanceBySession } = useApp();

  const session = sessions.find(s => s.id === id);
  if (!session) return <EmptyState title="Sesi tidak ditemukan" />;

  // praktikan yang terdaftar di sesi ini
  const roster = praktikanList.filter(p => USER_ENROLLMENTS[p.id]?.includes(session.id));
  const attendances = getAttendanceBySession(session.id);

  const rows = roster.map(p => ({
    praktikan: p,
    attendance: attendances.find(a => a.praktikanId === p.id),
  }));

  const hadir = rows.filter(r => r.attendance).length;
  const total = rows.length;
  const percent = total === 0 ? 0 : Math.round((hadir / total) * 100);

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={item => item.praktikan.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Text style={styles.title} numberOfLines={2}>
                {session.praktikum} - Kelas {session.kelas}
              </Text>
              <StatusBadge status={session.status} />
            </View>
            <Text style={styles.sub}>
              Pertemuan {session.pertemuan} • {session.materi}
            </Text>

            <View style={styles.stats}>
              <Text style={styles.statNumber}>
                {hadir}
                <Text style={styles.statTotal}> / {total}</Text>
              </Text>
              <Text style={styles.statLabel}>praktikan hadir ({percent}%)</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${percent}%` }]} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="Belum Ada Praktikan" desc="Tidak ada praktikan terdaftar di sesi ini." />
        }
        renderItem={({ item }) => (
          <RecapRow
            nama={item.praktikan.nama}
            nim={item.praktikan.nim}
            waktu={item.attendance?.waktu}
            catatan={item.attendance?.catatan}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 },
  statNumber: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statTotal: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  statLabel: { fontSize: 13, color: colors.textSecondary },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.status.DIBUKA },
});
