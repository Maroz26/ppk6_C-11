import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export const EmptyState = ({ title, desc, emoji = '📭' }: { title: string, desc?: string, emoji?: string }) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.title}>{title}</Text>
    {desc && <Text style={styles.desc}>{desc}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' }
});