import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
// @ts-ignore -- sentiment.js tidak punya definisi tipe
import model from '../../ai/model-edom.json';
import { createSentimentClassifier } from '../../ai/sentiment.js';
import { colors, styles } from '../theme';

// Model dibuat sekali di luar komponen agar tidak dibuat ulang setiap render.
const classify = createSentimentClassifier(model);

export default function TestAiScreen() {
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');

  function analyze() {
    if (!text.trim()) {
      setLabel('');
      setMessage('Tulis komentar terlebih dahulu.');
      return;
    }
    try {
      const prediction = classify(text.trim());
      setLabel(String(prediction.label));
      setMessage('');
    } catch {
      setLabel('');
      setMessage('Analisis gagal. Coba lagi.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.background} pointerEvents="none">
        <View style={styles.peach} />
        <View style={styles.teal} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.shadow}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>ANALISIS AI</Text>
            <Text style={styles.subtitle}>Analisis Sentimen Komentar</Text>
            <Text style={styles.label}>Komentar</Text>
            <TextInput
              accessibilityLabel="Komentar"
              placeholder="Tulis komentar untuk dianalisis"
              placeholderTextColor={colors.muted}
              selectionColor={colors.teal}
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
              onPress={analyze}
            >
              <Text style={styles.buttonLabel}>Analisis</Text>
            </Pressable>
            {!!label && (
              <View>
                <Text style={styles.label}>Hasil sentimen</Text>
                <Text style={styles.title}>{label}</Text>
              </View>
            )}
            {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}