import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RoleSelectScreen() {
  const { setRole } = useApp();

  const handleSelect = (role: 'PRAKTIKAN' | 'ASISTEN') => {
    setRole(role);
    router.push('/identitas');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASSIST</Text>
      <Text style={styles.subtitle}>Pilih peran Anda untuk masuk</Text>
      
      <TouchableOpacity style={styles.card} onPress={() => handleSelect('PRAKTIKAN')}>
        <Text style={styles.cardTitle}>PRAKTIKAN</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.card} onPress={() => handleSelect('ASISTEN')}>
        <Text style={styles.cardTitle}>ASISTEN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  card: { backgroundColor: colors.card, padding: 32, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text }
});