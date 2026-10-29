// src/screens/AttendanceHistoryScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { formatJamDetik, formatTanggal } from '../utils/formatTime';

export default function AttendanceHistoryScreen() {
  const { currentUser, sessions, getAttendanceByPraktikan } = useApp();
  const records = currentUser ? getAttendanceByPraktikan(currentUser.id) : [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Riwayat Kehadiran' }} />
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.summary}>Total kehadiran: {records.length} sesi</Text>
        }
        ListEmptyComponent={
          <EmptyState
            title="Belum Ada Riwayat"
            desc="Presensi yang kamu lakukan akan muncul di sini."
          />
        }
        renderItem={({ item }) => {
          const session = sessions.find(s => s.id === item.sessionId);
          return (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="checkmark-circle" size={22} color={colors.status.DIBUKA} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>
                  {session ? `${session.praktikum} - Kelas ${session.kelas}` : 'Sesi tidak diketahui'}
                </Text>
                {session && (
                  <Text style={styles.sub}>
                    Pertemuan {session.pertemuan} • {session.materi}
                  </Text>
                )}
                <Text style={styles.time}>
                  {formatTanggal(item.waktu)} • {formatJamDetik(item.waktu)}
                </Text>
                {!!item.catatan && <Text style={styles.note}>Catatan: {item.catatan}</Text>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 32 },
  summary: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  iconWrap: { marginRight: 12, paddingTop: 2 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: 13, color: colors.statusSoft.DIBUKA.text, fontWeight: '600', marginTop: 6 },
  note: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
