import { StyleSheet, Text, View } from 'react-native';
import { STATUS_COLOR, STATUS_LABEL, STATUS } from '../data/sessions';

export default function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR[STATUS.BELUM];
  const label = STATUS_LABEL[status] ?? 'Status tidak diketahui';

  return (
    <View
      accessibilityLabel={`Status sesi: ${label}`}
      style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}70` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.1 },
});