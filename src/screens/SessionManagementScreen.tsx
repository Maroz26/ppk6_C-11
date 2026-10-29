import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmModal from '../components/ConfirmModal';
import CyberpunkSignal from '../components/CyberpunkSignal';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { USER_ENROLLMENTS } from '../data/dummyData';
import { formatJam } from '../utils/formatTime';


export default function SessionManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, praktikanList, openSession, closeSession, getAttendanceBySession } = useApp();
  const session = sessions.find((s) => s.id === id);
  const [pendingAction, setPendingAction] = useState<'open' | 'close' | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');

  if (!session) {
    return (
      <SafeAreaView style={styles.center} edges={['left', 'right']}>
        <Text>Sesi tidak ditemukan.</Text>
      </SafeAreaView>
    );
  }

  const isOpen = session.status === 'DIBUKA';
  const isClosed = session.status === 'DITUTUP';
  const isBelum = session.status === 'BELUM_DIBUKA';
  const roster = praktikanList.filter((p) => USER_ENROLLMENTS[p.id]?.includes(session.id));
  const hadir = getAttendanceBySession(session.id).length;
  const activeStep = isClosed ? 2 : isOpen ? 1 : 0;

  const handleConfirm = () => {
    if (pendingAction === 'open') {
      openSession(session.id);
      setActionFeedback('Sesi berhasil dibuka. Praktikan sekarang dapat melakukan presensi.');
    } else if (pendingAction === 'close') {
      closeSession(session.id);
      setActionFeedback('Sesi berhasil ditutup. Presensi untuk sesi ini sudah dikunci.');
    }
    setPendingAction(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
        <Animated.View entering={FadeInDown.duration(380).reduceMotion(ReduceMotion.System)}>
          <Text style={styles.eyebrow}>SESSION CONTROL</Text>
          <Text style={styles.pageTitle}>Detail Sesi</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(430).reduceMotion(ReduceMotion.System)}
          style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>◈ PRAKTIKUM // KELAS {session.kelas}</Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={styles.nama}>{session.praktikum}</Text>
          <Text style={styles.heroCaption}>Kelola sesi dan pantau status presensi.</Text>
          <View style={styles.heroBottom}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroInfoLabel}>JADWAL</Text>
              <Text style={styles.heroInfoValue}>{session.tanggal}</Text>
              <Text style={styles.heroInfoValue}>{session.jamMulai}–{session.jamSelesai}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroInfoLabel}>RUANG</Text>
              <Text style={styles.heroInfoValue}>{session.ruang}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(450).reduceMotion(ReduceMotion.System)}
          style={styles.statusCard}>
          <View style={styles.statusTitleRow}>
            <View style={styles.statusIcon}>
              {isOpen
                ? <CyberpunkSignal size={8} />
                : <Text style={styles.statusIconText}>{isClosed ? '✓' : '○'}</Text>}
            </View>
            <View style={styles.statusHeading}>
              <Text style={styles.sectionTitle}>Status sesi</Text>
              <Text style={styles.statusSubtitle}>
                {isOpen ? 'Presensi sedang tersedia' : isClosed ? 'Sesi telah selesai' : 'Menunggu sesi dibuka'}
              </Text>
            </View>
            <StatusBadge status={session.status} />
          </View>

          <View style={styles.lifecycle}>
            <View style={styles.lifecycleHeading}>
              <Text style={styles.lifecycleTitle}>SESSION LIFECYCLE</Text>
              <Text style={styles.lifecycleIndex}>0{activeStep + 1} / 03</Text>
            </View>
            <View style={styles.flowTrack}>
              {['SCHEDULED', 'LIVE', 'LOCKED'].map((step, index) => {
                const isComplete = index <= activeStep;
                return (
                  <View key={step} style={styles.flowStep}>
                    <View style={styles.flowNodeRow}>
                      <View style={[styles.flowNode, isComplete && styles.flowNodeActive]} />
                      {index < 2 && (
                        <View style={[styles.flowConnector, index < activeStep && styles.flowConnectorActive]} />
                      )}
                    </View>
                    <Text style={[styles.flowLabel, isComplete && styles.flowLabelActive]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statusMessage}>
            {isBelum && (
              <Text style={styles.hint}>
                Sesi belum dibuka. Praktikan belum bisa melakukan presensi.
              </Text>
            )}
            {isOpen && (
              <Text style={styles.hint}>
                Sesi dibuka pukul {session.dibukaPada ? formatJam(session.dibukaPada) : '-'}. Praktikan dapat melakukan presensi. Hadir: {hadir} dari {roster.length} praktikan.
              </Text>
            )}
            {isClosed && (
              <Text style={styles.hint}>
                Sesi ditutup pukul {session.ditutupPada ? formatJam(session.ditutupPada) : '-'}. Presensi sudah dikunci. Total hadir: {hadir} dari {roster.length} praktikan.
              </Text>
            )}
          </View>

          {isBelum && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActionFeedback('');
                setPendingAction('open');
              }}
              style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}>
              <Text style={styles.btnText}>Buka sesi</Text>
              <Text style={styles.buttonArrow}>↗</Text>
            </Pressable>
          )}

          {isOpen && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActionFeedback('');
                setPendingAction('close');
              }}
              style={({ pressed }) => [styles.btn, styles.danger, pressed && styles.pressed]}>
              <Text style={[styles.btnText, styles.dangerButtonText]}>Tutup sesi</Text>
              <Text style={[styles.buttonArrow, styles.dangerArrow]}>↗</Text>
            </Pressable>
          )}

          {isClosed && (
            <View style={styles.closedNotice}>
              <Text style={styles.closedNoticeText}>Sesi sudah ditutup dan tidak dapat dibuka kembali.</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/rekap/${session.id}`)}
            style={({ pressed }) => [styles.recapButton, pressed && styles.pressed]}>
            <Text style={styles.recapButtonText}>Lihat rekap kehadiran</Text>
            <Text style={styles.recapArrow}>→</Text>
          </Pressable>

          {!!actionFeedback && (
            <Animated.Text
              entering={FadeInDown.duration(300).reduceMotion(ReduceMotion.System)}
              accessibilityLiveRegion="polite"
              style={styles.feedback}>
              {actionFeedback}
            </Animated.Text>
          )}
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(240).duration(400).reduceMotion(ReduceMotion.System)}
          style={styles.footerText}>
          ASSIST • v1.0.0
        </Animated.Text>
        </View>

        <ConfirmModal
          visible={pendingAction !== null}
          danger={pendingAction === 'close'}
          title={pendingAction === 'open' ? 'Buka sesi sekarang?' : 'Tutup sesi ini?'}
          message={
            pendingAction === 'open'
              ? `Praktikan dapat melakukan presensi untuk praktikum setelah sesi dibuka`
              : 'Setelah ditutup, praktikan tidak dapat melakukan presensi lagi. Sesi yang ditutup tidak dapat dibuka kembali.'
          }
          confirmLabel={pendingAction === 'open' ? 'Buka Sesi' : 'Tutup Sesi'}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  page: { width: '100%', maxWidth: 700, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F5F7F5' },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 28 },
  backArrow: { color: '#087F5B', fontSize: 28, lineHeight: 30, marginRight: 7 },
  backLabel: { color: '#087F5B', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#537366' },
  pageTitle: { color: '#17382D', fontSize: 30, fontWeight: '800', letterSpacing: 0.2, marginTop: 5, marginBottom: 18 },
  heroCard: { padding: 20, borderRadius: 20, backgroundColor: '#0F3B2E', borderWidth: 1, borderColor: '#1D604A' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroLabel: { color: '#A8DCC2', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  nama: { color: '#F3FAF5', fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 18 },
  heroCaption: { color: '#C1D8CC', fontSize: 12, lineHeight: 18, marginTop: 5 },
  heroBottom: { flexDirection: 'row', gap: 28, marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#39705A' },
  heroInfo: { flex: 1 },
  heroInfoLabel: { color: '#A8DCC2', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  heroInfoValue: { color: '#F3FAF5', fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 5 },
  statusCard: { padding: 18, marginTop: 14, borderRadius: 20, backgroundColor: '#FFFEFC', borderWidth: 1, borderColor: '#D5E4DB' },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E8F3EC', borderWidth: 1, borderColor: '#C8DFD1', alignItems: 'center', justifyContent: 'center' },
  statusIconText: { color: '#087F5B', fontSize: 15, fontWeight: '700' },
  statusHeading: { flex: 1 },
  sectionTitle: { color: '#17382D', fontSize: 15, fontWeight: '700' },
  statusSubtitle: { color: '#718078', fontSize: 10, marginTop: 3 },
  lifecycle: { marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: '#F2F7F3', borderWidth: 1, borderColor: '#DDE9E1' },
  lifecycleHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  lifecycleTitle: { color: '#537366', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 },
  lifecycleIndex: { color: '#087F5B', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  flowTrack: { flexDirection: 'row' },
  flowStep: { flex: 1 },
  flowNodeRow: { flexDirection: 'row', alignItems: 'center' },
  flowNode: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#A8B9AF', backgroundColor: '#FFFFFF' },
  flowNodeActive: { backgroundColor: '#2F9E70', borderColor: '#2F9E70' },
  flowConnector: { height: 1, flex: 1, backgroundColor: '#D4E1D8' },
  flowConnectorActive: { backgroundColor: '#2F9E70' },
  flowLabel: { color: '#718078', fontSize: 8, fontWeight: '700', letterSpacing: 0.6, marginTop: 7 },
  flowLabelActive: { color: '#087F5B' },
  statusMessage: { paddingVertical: 17 },
  hint: { color: '#68786F', fontSize: 12, lineHeight: 19 },
  btn: { minHeight: 50, flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#087F5B' },
  danger: { backgroundColor: '#A64F58', borderWidth: 1, borderColor: '#A64F58' },
  pressed: { opacity: 0.75 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },
  dangerButtonText: { color: '#FFFFFF' },
  buttonArrow: { position: 'absolute', right: 16, color: '#D7F2E3', fontSize: 17, fontWeight: '700' },
  dangerArrow: { color: '#FFFFFF' },
  closedNotice: { padding: 13, borderRadius: 12, backgroundColor: '#FBF3F3', borderWidth: 1, borderColor: '#E9D1D3' },
  closedNoticeText: { color: '#8E4B52', fontSize: 11, lineHeight: 17 },
  recapButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 10 },
  recapButtonText: { color: '#087F5B', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  recapArrow: { color: '#087F5B', fontSize: 18, fontWeight: '700' },
  feedback: { fontSize: 11, lineHeight: 17, color: '#245744', backgroundColor: '#E8F3EC', borderWidth: 1, borderColor: '#C8DFD1', padding: 12, borderRadius: 12, marginTop: 8 },
  footerText: { color: '#87958D', textAlign: 'center', fontSize: 8, fontWeight: '700', letterSpacing: 1.2, marginTop: 26 },
});