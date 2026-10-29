import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import CyberpunkSignal from '../../../components/CyberpunkSignal';
import StatusBadge from '../../../components/StatusBadge';
import { useSessions } from '../../../context/SessionContext';

export default function AssistantRecapRoute() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { sessions } = useSessions();
  const session = sessions.find((item) => item.id === String(sessionId));

  if (!session) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <Text>Sesi tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke detail sesi"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Detail sesi</Text>
        </Pressable>
        <Animated.View entering={FadeInDown.duration(400).reduceMotion(ReduceMotion.System)}>
          <View style={styles.archiveHeader}>
            <Text style={styles.eyebrow}>DAFTAR KEHADIRAN</Text>
            <View style={styles.archiveStatus}>
              <CyberpunkSignal size={6} />
              <Text style={styles.archiveStatusText}>DATA SYNCED</Text>
            </View>
          </View>
          <Text style={styles.title}>{session.namaPrak}</Text>

        </Animated.View>
        <Animated.View
          entering={FadeInDown.delay(80).duration(430).reduceMotion(ReduceMotion.System)}
          style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryLabel}>TOTAL PRESENSI</Text>
            <Text style={styles.archiveCode}>SESSION {session.id}</Text>
          </View>
          <View style={styles.summaryCountRow}>
            <Text style={styles.summaryNumber}>{String(session.attendance.length).padStart(2, '0')}</Text>
            <Text style={styles.summaryText}>presensi tercatat</Text>
          </View>
          <StatusBadge status={session.status} />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(150).duration(400).reduceMotion(ReduceMotion.System)}
          style={styles.sectionTitle}>
          Daftar kehadiran
        </Animated.Text>
        {session.attendance.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400).reduceMotion(ReduceMotion.System)}
            style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Belum ada presensi</Text>
            <Text style={styles.empty}>Data kehadiran akan muncul di sini setelah praktikan mengisi presensi.</Text>
          </Animated.View>
        ) : (
          session.attendance.map((record, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(Math.min(index, 5) * 65)
                .duration(400)
                .reduceMotion(ReduceMotion.System)}
              style={styles.record}>
              <Text style={styles.recordIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.recordText}>{JSON.stringify(record)}</Text>
            </Animated.View>
          ))
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F5' },
  scrollView: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 40 },
  page: { width: '100%', maxWidth: 700, alignSelf: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 20 },
  backButtonPressed: { opacity: 0.65 },
  backArrow: { color: '#087F5B', fontSize: 28, lineHeight: 30, marginRight: 7 },
  backLabel: { color: '#087F5B', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F5F7F5' },
  archiveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { color: '#537366', fontSize: 9, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  archiveStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FFFEFC', borderWidth: 1, borderColor: '#D5E4DB' },
  archiveStatusText: { color: '#087F5B', fontSize: 7, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: '#17382D', fontSize: 24, lineHeight: 31, fontWeight: '700', marginTop: 14 },
  meta: { color: '#68786F', fontSize: 10, lineHeight: 18, marginTop: 5 },
  summaryCard: { alignItems: 'flex-start', padding: 20, marginTop: 22, borderRadius: 20, backgroundColor: '#0F3B2E', borderWidth: 1, borderColor: '#1D604A', gap: 10 },
  summaryTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summaryLabel: { color: '#A8DCC2', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  archiveCode: { color: '#C1D8CC', fontSize: 8, fontWeight: '600', letterSpacing: 0.5 },
  summaryCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  summaryNumber: { color: '#A8DCC2', fontSize: 38, fontWeight: '800' },
  summaryText: { color: '#F3FAF5', fontSize: 12 },
  sectionTitle: { color: '#17382D', fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  emptyCard: { padding: 20, borderRadius: 18, backgroundColor: '#FFFEFC', borderWidth: 1, borderColor: '#D5E4DB' },
  emptyTitle: { color: '#17382D', fontSize: 13, fontWeight: '700' },
  empty: { color: '#68786F', fontSize: 11, lineHeight: 17, marginTop: 5 },
  record: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, marginBottom: 9, borderRadius: 16, backgroundColor: '#FFFEFC', borderWidth: 1, borderColor: '#D5E4DB' },
  recordIndex: { color: '#087F5B', fontSize: 10, fontWeight: '700' },
  recordText: { flex: 1, color: '#34483D', fontSize: 11, lineHeight: 17 },
});
