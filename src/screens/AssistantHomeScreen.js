import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import CyberpunkSignal from '../components/CyberpunkSignal';
import StatusBadge from '../components/StatusBadge';
import { useSessions } from '../context/SessionContext';
import { STATUS } from '../data/sessions';
import { Ionicons } from "@expo/vector-icons";

const SESSION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: STATUS.BELUM, label: 'Not Started' },
  { key: STATUS.DIBUKA, label: 'Open' },
  { key: STATUS.DITUTUP, label: 'Closed' },
];

export default function AssistantHomeScreen({ navigation }) {
  const { sessions } = useSessions();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const totalDibuka = sessions.filter((session) => session.status === STATUS.DIBUKA).length;
  const activeRatio = sessions.length ? totalDibuka / sessions.length : 0;
  const filteredSessions = selectedFilter === 'all'
    ? sessions
    : sessions.filter((session) => session.status === selectedFilter);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View
            entering={FadeInDown.duration(420).reduceMotion(ReduceMotion.System)}
            style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>A</Text>
              </View>
              <View>
                <Text style={styles.brandName}>HALAMAN ASISTEN</Text>
                <Text style={styles.brandCaption}>PRAKTIKUM</Text>
              </View>
              <View style={styles.networkStatus}>
                <CyberpunkSignal />
                <Text style={styles.networkLabel}>ONLINE</Text>
              </View>
            </View>

            <View style={styles.welcome}>
              <Text style={styles.eyebrow}>◈ PRODI INFORMATIKA ◈</Text>
              <Text style={styles.title}>ASSIST</Text>
              <Text style={styles.subtitle}>Platform Kelola Sesi Praktikum</Text>
            </View>

            <Animated.View
              entering={FadeInDown.delay(100).duration(450).reduceMotion(ReduceMotion.System)}
              style={styles.summaryCard}>
              <View style={styles.summaryOrb}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryEyebrow}></Text>
                <Text style={styles.summaryTitle}>
                  {totalDibuka > 0 ? 'Ada sesi yang sedang berjalan' : 'Monitor Jadwal Praktikum Kamu'}
                </Text>
                <Text style={styles.summaryCaption}>
                  {totalDibuka > 0
                    ? `${totalDibuka} sesi sedang menerima presensi`
                    : 'Cek detail sesi sebelum praktikum dimulai.'}
                </Text>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNumber}>{sessions.length}</Text>
                  <Text style={styles.statLabel}>TOTAL SESI</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statNumber, styles.activeNumber]}>{totalDibuka}</Text>
                  <Text style={styles.statLabel}>SEDANG BUKA</Text>
                </View>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>SESSION SYNC</Text>
                <Text style={styles.syncValue}>{totalDibuka} / {sessions.length} ACTIVE</Text>
              </View>
              <View
                accessibilityLabel={`${Math.round(activeRatio * 100)} persen sesi sedang aktif`}
                style={styles.syncTrack}>
                <View style={[styles.syncFill, { width: `${Math.round(activeRatio * 100)}%` }]} />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(180).duration(450).reduceMotion(ReduceMotion.System)}
              style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Jadwal sesi</Text>
                <Text style={styles.sectionCaption}>Filter sesi berdasarkan statusnya.</Text>
              </View>
              <View style={styles.sessionCount}>
                <Text style={styles.sessionCountText}>{filteredSessions.length}</Text>
              </View>
            </Animated.View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              style={styles.filterScroll}>
              {SESSION_FILTERS.map((filter) => {
                const isSelected = selectedFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedFilter(filter.key)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                      pressed && styles.filterChipPressed,
                    ]}>
                    <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeInDown.duration(420).reduceMotion(ReduceMotion.System)}
            style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>—</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {sessions.length === 0 ? 'Belum ada sesi' : 'Tidak ada sesi pada filter ini'}
            </Text>
            <Text style={styles.emptyText}>
              {sessions.length === 0
                ? 'Jadwal praktikum kamu akan muncul di sini.'
                : 'Pilih filter status lain untuk melihat sesi.'}
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 5) * 75)
              .duration(430)
              .reduceMotion(ReduceMotion.System)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Kelola ${item.namaPrak}, kelas ${item.kelas}, ${item.tanggal} ${item.jam}, status ${item.status}`}
              onPress={() => navigation.navigate('SessionManagement', { sessionId: item.id })}
              style={({ pressed }) => [styles.sessionCard, pressed && styles.cardPressed]}>
              <View style={styles.cardTopLine}>
                <Text style={styles.cardIndex}>SESI {String(index + 1).padStart(2, '0')}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.sessionName}>{item.namaPrak}</Text>
              <View style={styles.sessionMeta}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>KELAS {item.kelas}</Text>
                </View>
                <Text style={styles.metaText}>{item.tanggal}, {item.jam}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.roomText}>RUANG  <Text style={styles.roomValue}>{item.ruang}</Text></Text>
                <Text style={styles.manageLink}>Kelola sesi  ↗</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F5' },
  listContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 132,
  },
  header: { gap: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2EB',
    borderWidth: 1,
    borderColor: '#C8DFD1',
  },
  brandMarkText: { color: '#087F5B', fontSize: 20, fontWeight: '800' },
  brandName: { color: '#17382D', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  brandCaption: { color: '#71847A', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 3 },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D5E4DB',
    backgroundColor: '#FFFEFC',
  },
  networkLabel: { color: '#087F5B', fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2EB',
    borderWidth: 1,
    borderColor: '#C8DFD1',
  },
  avatarText: { color: '#087F5B', fontSize: 12, fontWeight: '800' },
  welcome: { marginTop: 38, marginBottom: 22 },
  eyebrow: { color: '#087F5B', fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: '#17382D', fontSize: 36, fontWeight: '800', letterSpacing: 1.8, marginTop: 7 },
  subtitle: { color: '#68786F', fontSize: 14, lineHeight: 21, marginTop: 5 },
  summaryCard: {
    overflow: 'hidden',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0F3B2E',
    borderWidth: 1,
    borderColor: '#1D604A',
    borderLeftWidth: 3,
    borderLeftColor: '#42B883',
    minHeight: 200,
  },
  summaryCopy: { maxWidth: '82%' },
  summaryEyebrow: { color: '#A8DCC2', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  summaryTitle: { color: '#F3FAF5', fontSize: 19, lineHeight: 25, fontWeight: '700', marginTop: 9 },
  summaryCaption: { color: '#C1D8CC', fontSize: 12, lineHeight: 18, marginTop: 5 },
  summaryOrb: {
    position: 'absolute',
    top: 17,
    right: 18,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#245744',
  },
  summaryOrbText: { color: '#C1E8D0', fontSize: 25, fontWeight: '700' },
  summaryStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 16 },
  statBlock: { minWidth: 78 },
  statNumber: { color: '#F3FAF5', fontSize: 22, fontWeight: '800' },
  activeNumber: { color: '#A8DCC2' },
  statLabel: { color: '#C1D8CC', fontSize: 8, fontWeight: '700', letterSpacing: 1.1, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#39705A' },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  syncLabel: { color: '#C1D8CC', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  syncValue: { color: '#A8DCC2', fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
  syncTrack: { height: 4, overflow: 'hidden', marginTop: 8, borderRadius: 4, backgroundColor: '#245744' },
  syncFill: { height: '100%', borderRadius: 4, backgroundColor: '#65C99A' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 14,
  },
  filterScroll: { flexGrow: 0, marginBottom: 14 },
  filterList: { gap: 8, paddingRight: 4 },
  filterChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E4DB',
    backgroundColor: '#FFFEFC',
  },
  filterChipSelected: { backgroundColor: '#087F5B', borderColor: '#087F5B' },
  filterChipPressed: { opacity: 0.75 },
  filterText: { color: '#537366', fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  sectionTitle: { color: '#17382D', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionCaption: { color: '#718078', fontSize: 11, lineHeight: 16, marginTop: 4, maxWidth: 270 },
  sessionCount: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2EB',
  },
  sessionCountText: { color: '#087F5B', fontSize: 12, fontWeight: '800' },
  sessionCard: {
    padding: 18,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D5E4DB',
    backgroundColor: '#FFFEFC',
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  cardTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIndex: { color: '#71847A', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  sessionName: { color: '#17382D', fontSize: 17, fontWeight: '700', lineHeight: 23, marginTop: 15 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginTop: 11 },
  metaChip: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#E8F3EC' },
  metaChipText: { color: '#087F5B', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  metaText: { color: '#68786F', fontSize: 11, flexShrink: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#E5ECE7',
  },
  roomText: { color: '#718078', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  roomValue: { color: '#34483D', fontWeight: '700', letterSpacing: 0 },
  manageLink: { color: '#087F5B', fontSize: 11, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#FFFEFC',
    borderWidth: 1,
    borderColor: '#D5E4DB',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2EB',
  },
  emptyIconText: { color: '#087F5B', fontSize: 24, fontWeight: '700' },
  emptyTitle: { color: '#17382D', fontSize: 16, fontWeight: '700', marginTop: 14 },
  emptyText: { color: '#718078', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
