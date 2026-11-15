import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ReviewCard } from '../components/ReviewCard';
import { useApp } from '../context/AppContext';
import { useMyReviews, useSessionReviews } from '../hooks/useReviews';
import { submitReview } from '../services/reviewService';
import { colors } from '../theme/colors';
import { Session } from '../types';

const MIN = 10;
const MAX = 500;

const labelOf = (s?: Session) => (s ? `${s.praktikum} ${s.kelas} - Pertemuan ${s.pertemuan}` : undefined);

function StudentReviews() {
  const { currentUser, sessions } = useApp();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const [selected, setSelected] = useState<string | null>(params.sessionId ?? null);
  const [teks, setTeks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews, loading } = useMyReviews(currentUser?.id);

  const reviewable = sessions.filter(s => s.status !== 'BELUM_DIBUKA');
  const activeId = selected;

  const handleSubmit = async () => {
    const trimmed = teks.trim();
    if (!currentUser || !activeId) {
      setErrorMsg('Pilih sesi terlebih dahulu.');
      return;
    }
    if (trimmed.length < MIN) {
      setErrorMsg(`Tulis minimal ${MIN} karakter.`);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await submitReview(activeId, currentUser, trimmed);
      setTeks('');
      Alert.alert('Terkirim', 'Kesan dan pesanmu sudah tersimpan.');
    } catch {
      setErrorMsg('Gagal mengirim. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Tulis Kesan & Pesan</Text>

      <Text style={styles.label}>Sesi</Text>
      {reviewable.length === 0 ? (
        <Text style={styles.hint}>
          Belum ada sesi yang bisa diulas. Sesi harus sudah dibuka oleh asisten.
        </Text>
      ) : (
        <>
          <Text style={styles.hint}>
            {activeId
              ? `Mengulas: ${labelOf(sessions.find(s => s.id === activeId))}`
              : 'Pilih sesi yang ingin diulas.'}
          </Text>
          <View style={styles.chips}>
            {reviewable.map(s => (
              <Pressable
                key={s.id}
                onPress={() => setSelected(s.id)}
                style={[styles.chip, activeId === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, activeId === s.id && styles.chipTextActive]}>{labelOf(s)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>Kesan & pesan</Text>
      <TextInput
        style={styles.input}
        value={teks}
        onChangeText={t => {
          setTeks(t);
          if (errorMsg) setErrorMsg('');
        }}
        placeholder="Ceritakan kesan dan pesanmu untuk sesi ini"
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={MAX}
        textAlignVertical="top"
      />
      <Text style={styles.counter}>
        {teks.length}/{MAX}
      </Text>
      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <Pressable
        style={({ pressed }) => [styles.btn, (pressed || submitting) && styles.btnPressed]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting && <ActivityIndicator color={colors.textOnPrimary} />}
        <Text style={styles.btnText}>{submitting ? 'Mengirim...' : 'Kirim'}</Text>
      </Pressable>

      <Text style={[styles.heading, styles.headingGap]}>Riwayat Kesan & Pesanku</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : reviews.length === 0 ? (
        <Text style={styles.hint}>Belum ada kesan & pesan.</Text>
      ) : (
        reviews.map(r => (
          <ReviewCard
            key={r.id}
            nama={r.nama}
            nim={r.nim}
            teks={r.teks}
            sentimen={r.sentimen}
            dibuatPada={r.dibuatPada}
            sessionLabel={labelOf(sessions.find(s => s.id === r.sessionId))}
          />
        ))
      )}
    </ScrollView>
  );
}

function AssistantReviews({ sessionId }: { sessionId?: string }) {
  const { sessions } = useApp();
  const { data, loading, error } = useSessionReviews(sessionId);

  const mine = new Set(sessions.map(s => s.id));
  const reviews = sessionId ? data : data.filter(r => mine.has(r.sessionId));

  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  if (error) return <EmptyState title="Gagal memuat" desc={error} />;

  return (
    <FlatList
      data={reviews}
      keyExtractor={r => r.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<Text style={styles.heading}>Total: {reviews.length} kesan & pesan</Text>}
      ListEmptyComponent={
        <EmptyState title="Belum Ada Kesan & Pesan" desc="Ulasan praktikan akan muncul di sini." />
      }
      renderItem={({ item }) => (
        <ReviewCard
          nama={item.nama}
          nim={item.nim}
          teks={item.teks}
          sentimen={item.sentimen}
          dibuatPada={item.dibuatPada}
          sessionLabel={labelOf(sessions.find(s => s.id === item.sessionId))}
          showAuthor
        />
      )}
    />
  );
}

export default function ReviewScreen() {
  const { role } = useApp();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Kesan & Pesan' }} />
      {role === 'ASISTEN' ? <AssistantReviews sessionId={sessionId} /> : <StudentReviews />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: 32 },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  headingGap: { marginTop: 28 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 4 },
  hint: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  input: {
    minHeight: 120,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  counter: { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  error: { fontSize: 13, color: colors.status.DITUTUP, marginTop: 6 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
  },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
});
