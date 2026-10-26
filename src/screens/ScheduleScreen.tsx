import { EmptyState } from '@/components/EmptyState';
import { SessionCard } from '@/components/SessionCard';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { SessionStatus } from '@/types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScheduleScreen() {
  const { sessions } = useApp();
  const [filter, setFilter] = useState<SessionStatus | 'SEMUA'>('SEMUA');

  const filteredSessions = sessions
    .filter(s => filter === 'SEMUA' ? true : s.status === filter)
    .sort((a, b) => new Date(`${a.tanggal}T${a.jamMulai}`).getTime() - new Date(`${b.tanggal}T${b.jamMulai}`).getTime());

  const filters: (SessionStatus | 'SEMUA')[] = ['SEMUA', 'BELUM_DIBUKA', 'DIBUKA', 'DITUTUP'];
  const labels = { SEMUA: 'Semua', BELUM_DIBUKA: 'Belum Dibuka', DIBUKA: 'Dibuka', DITUTUP: 'Ditutup' };

  return (
    <View style={styles.container}>
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{labels[f]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => router.push(`/sesi/${item.id}`)} />
        )}
        ListEmptyComponent={<EmptyState title="Tidak ada sesi" desc="Jadwal kosong untuk filter ini" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterWrapper: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: 'white', fontWeight: 'bold' }
});