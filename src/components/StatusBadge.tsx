import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { SessionStatus } from '../types';

export const StatusBadge = ({ status }: { status: SessionStatus }) => {
  const labels = { BELUM_DIBUKA: 'Belum Dibuka', DIBUKA: 'Sedang Dibuka', DITUTUP: 'Ditutup' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.status[status] }]}>
      <Text style={styles.text}>{labels[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  text: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});