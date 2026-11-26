// src/screens/ReviewScreen.tsx
// Ulasan / kesan & pesan (redesign). Satu route (/ulasan) untuk dua peran:
// - Praktikan: tulis ulasan untuk sesi yang sudah dibuka, lalu lihat riwayat ulasannya.
// - Asisten: daftar ulasan dengan ringkasan sentimen dan filter.
// Bisa dibuka dengan ?sessionId=... (dari Detail Sesi).
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { PillTone, StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import { useMyReviews, useSessionReviews } from '../hooks/useReviews';
import { Review, submitReview } from '../services/reviewService';
import { color, font, radius } from '../theme/tokens';
import { Session } from '../types';
import { labelHari, toLocalDate } from '../utils/dateId';
import { formatJam, formatTanggal } from '../utils/formatTime';

const MIN = 10;
const MAX = 500;

type Sentimen = 'positif' | 'netral' | 'negatif';
const SENTIMEN: Record<Sentimen, { label: string; tone: PillTone }> = {
  positif: { label: 'Positif', tone: 'success' },
  netral: { label: 'Netral', tone: 'info' },
  negatif: { label: 'Negatif', tone: 'danger' },
};

function sentimenOf(r: Review): Sentimen | null {
  const key = r.sentimen?.toLowerCase();
  return key === 'positif' || key === 'netral' || key === 'negatif' ? key : null;
}

function sessionLine(s?: Session) {
  if (!s) return 'Sesi tidak ditemukan';
  const d = toLocalDate(s.tanggal, s.jamMulai);
  return `${s.praktikum} · Kelas ${s.kelas} · P${s.pertemuan}${d ? ` · ${labelHari(d)}` : ''}`;
}

function ReviewItem({ review, session, showAuthor }: { review: Review; session?: Session; showAuthor?: boolean }) {
  const s = sentimenOf(review);
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.flex}>
          {showAuthor && <Text style={styles.author}>{review.nama} · {review.nim}</Text>}
          <Text style={styles.sub} numberOfLines={1}>{sessionLine(session)}</Text>
        </View>
        <StatusPill label={s ? SENTIMEN[s].label : 'Belum dinilai'} tone={s ? SENTIMEN[s].tone : 'neutral'} />
      </View>
      <Text style={styles.reviewText}>{review.teks}</Text>
      <Text style={styles.sub}>{formatTanggal(review.dibuatPada)} · {formatJam(review.dibuatPada)}</Text>
    </View>
  );
}

// ===== Praktikan =====

function StudentReviews() {
  const { currentUser, sessions } = useApp();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { data: reviews, loading } = useMyReviews(currentUser?.id);
  const [selected, setSelected] = useState<string | null>(params.sessionId ?? null);
  const [teks, setTeks] = useState('');
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sesi yang bisa diulas: sudah dibuka atau ditutup, dan belum pernah kamu ulas.
  const reviewable = useMemo(() => {
    const done = new Set(reviews.map((r) => r.sessionId));
    return sessions
      .filter((s) => s.status !== 'BELUM_DIBUKA' && !done.has(s.id))
      .sort((a, b) => `${b.tanggal} ${b.jamMulai}`.localeCompare(`${a.tanggal} ${a.jamMulai}`));
  }, [sessions, reviews]);

  const active = reviewable.find((s) => s.id === selected) ?? null;

  async function submit() {
    const trimmed = teks.trim();
    setFeedback('');
    if (!currentUser || !active) {
      setError('Pilih sesi terlebih dahulu.');
      return;
    }
    if (trimmed.length < MIN) {
      setError(`Tulis minimal ${MIN} karakter.`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await submitReview(active.id, currentUser, trimmed);
      setTeks('');
      setSelected(null);
      setFeedback('Terima kasih! Ulasanmu sudah tersimpan.');
    } catch {
      setError('Gagal mengirim. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DecoratedScreen title="Ulasan" tone="praktikan">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tulis Kesan & Pesan</Text>

        <Text style={styles.label}>Sesi</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sesi: ${active ? active.praktikum : 'belum dipilih'}`}
          onPress={() => setPicker(true)}
          style={({ pressed }) => [styles.select, pressed && styles.pressed]}
        >
          <Text style={[styles.selectText, !active && styles.placeholder]} numberOfLines={1}>
            {active ? sessionLine(active) : 'Pilih sesi'}
          </Text>
          <Feather name="chevron-down" size={18} color={color.purpleInk} />
        </Pressable>

        <Text style={styles.label}>Kesan & pesan</Text>
        <TextInput
          accessibilityLabel="Kesan dan pesan"
          style={styles.textarea}
          value={teks}
          onChangeText={(t) => {
            setTeks(t);
            setError('');
          }}
          placeholder="Ceritakan kesan dan pesanmu untuk sesi ini"
          placeholderTextColor={color.placeholder}
          selectionColor={color.purpleDeep}
          multiline
          maxLength={MAX}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{teks.length}/{MAX}</Text>

        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        {!!feedback && <Text style={styles.success} accessibilityLiveRegion="polite">{feedback}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          onPress={submit}
          style={({ pressed }) => [styles.primary, (pressed || submitting) && styles.pressed]}
        >
          {submitting && <ActivityIndicator color={color.onDark} />}
          <Text style={styles.primaryText}>{submitting ? 'Mengirim...' : 'Kirim Ulasan'}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Ulasanku</Text>
      {loading ? (
        <ActivityIndicator color={color.plum} />
      ) : reviews.length === 0 ? (
        <Text style={styles.helper}>Belum ada ulasan.</Text>
      ) : (
        reviews.map((r) => <ReviewItem key={r.id} review={r} session={sessions.find((s) => s.id === r.sessionId)} />)
      )}

      <BottomSheet visible={picker} title="Pilih sesi" onClose={() => setPicker(false)}>
        {reviewable.length === 0 ? (
          <Text style={styles.helper}>
            Belum ada sesi yang bisa diulas. Sesi harus sudah dibuka asisten, dan setiap sesi hanya bisa diulas sekali.
          </Text>
        ) : (
          <ScrollView style={styles.sheetList}>
            {reviewable.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: s.id === selected }}
                onPress={() => {
                  setSelected(s.id);
                  setPicker(false);
                  setError('');
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text style={[styles.optionText, styles.flex]}>{sessionLine(s)}</Text>
                {s.id === selected && <Feather name="check" size={18} color={color.plum} />}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </BottomSheet>
    </DecoratedScreen>
  );
}

// ===== Asisten =====

function AssistantReviews({ sessionId }: { sessionId?: string }) {
  const { sessions } = useApp();
  const { data, loading, error } = useSessionReviews(sessionId);
  const [filter, setFilter] = useState<Sentimen | 'semua'>('semua');

  const ids = useMemo(() => new Set(sessions.map((s) => s.id)), [sessions]);
  const reviews = sessionId ? data : data.filter((r) => ids.has(r.sessionId));
  const counts = useMemo(() => {
    const c = { positif: 0, netral: 0, negatif: 0 };
    reviews.forEach((r) => {
      const s = sentimenOf(r);
      if (s) c[s] += 1;
    });
    return c;
  }, [reviews]);
  const shown = filter === 'semua' ? reviews : reviews.filter((r) => sentimenOf(r) === filter);
  const session = sessionId ? sessions.find((s) => s.id === sessionId) : undefined;

  return (
    <DecoratedScreen title="Ulasan" tone="asisten">
      {sessionId && (
        <View style={styles.scope}>
          <Text style={[styles.scopeText, styles.flex]} numberOfLines={2}>Ulasan untuk {sessionLine(session)}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.setParams({ sessionId: '' })} hitSlop={8}>
            <Text style={styles.scopeLink}>Semua</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.summary}>
        {(['positif', 'netral', 'negatif'] as Sentimen[]).map((k) => (
          <View key={k} style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{counts[k]}</Text>
            <StatusPill label={SENTIMEN[k].label} tone={SENTIMEN[k].tone} />
          </View>
        ))}
      </View>

      <View style={styles.filters} accessibilityRole="radiogroup">
        {(['semua', 'positif', 'netral', 'negatif'] as const).map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {f === 'semua' ? `Semua (${reviews.length})` : SENTIMEN[f].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={color.plum} />
      ) : error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : shown.length === 0 ? (
        <Text style={styles.helper}>Belum ada ulasan{filter !== 'semua' ? ` ${SENTIMEN[filter].label.toLowerCase()}` : ''}.</Text>
      ) : (
        shown.map((r) => (
          <ReviewItem key={r.id} review={r} session={sessions.find((s) => s.id === r.sessionId)} showAuthor />
        ))
      )}
    </DecoratedScreen>
  );
}

export default function ReviewScreen() {
  const { role } = useApp();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  return role === 'ASISTEN' ? <AssistantReviews sessionId={sessionId || undefined} /> : <StudentReviews />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  card: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 20,
    gap: 8,
  },
  cardTitle: { fontFamily: font.display, fontSize: 24, color: color.ink, marginBottom: 4 },
  label: { fontFamily: font.medium, fontSize: 14, color: color.ink, marginTop: 6 },
  select: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
  },
  selectText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: color.ink },
  placeholder: { fontFamily: font.regular, fontStyle: 'italic', color: color.placeholder },
  textarea: {
    minHeight: 130,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: color.purpleInk,
    fontFamily: font.regular,
    fontSize: 15,
    color: color.ink,
  },
  counter: { alignSelf: 'flex-end', fontFamily: font.regular, fontSize: 12, color: color.muted },
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 12 },
  success: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.success, backgroundColor: color.successSoft, borderRadius: radius.sm, padding: 12 },
  primary: {
    minHeight: 52,
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: color.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: font.display, fontSize: 19, color: color.onDark },

  section: { fontFamily: font.display, fontSize: 22, color: color.ink, marginTop: 4 },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  reviewCard: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 16,
    gap: 6,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  author: { fontFamily: font.semibold, fontSize: 14, color: color.ink },
  sub: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  reviewText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },

  scope: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.card,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scopeText: { fontFamily: font.medium, fontSize: 13, color: color.ink },
  scopeLink: { fontFamily: font.semibold, fontSize: 13, color: color.purpleDeep, textDecorationLine: 'underline' },
  summary: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryValue: { fontFamily: font.display, fontSize: 30, color: color.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.card,
    borderWidth: 1.5,
    borderColor: color.lavender,
  },
  chipOn: { backgroundColor: color.plum, borderColor: color.plum },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: color.purpleInk },
  chipTextOn: { color: color.onDark },

  sheetList: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  optionText: { fontFamily: font.medium, fontSize: 14, color: color.ink },
});
