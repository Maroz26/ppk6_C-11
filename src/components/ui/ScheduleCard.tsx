import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, roleTheme, RoleTone, sessionStatusColor } from '../../theme/tokens';
import { SessionStatus } from '../../types';

// Kartu jadwal di halaman Jadwal (Figma: jadwal-prak, kartu "Basis Data").
// Seluruh kartu bisa ditekan untuk membuka detail sesi.
export function ScheduleCard({ title, location, timeLabel, rightLabel, status, onPress, tone = 'praktikan' }: {
  title: string;
  location: string;
  timeLabel: string; // "08:00 - 10:00"
  rightLabel: string; // misalnya "Kelas C · P3"
  status: SessionStatus;
  onPress: () => void;
  tone?: RoleTone;
}) {
  const theme = roleTheme[tone];
  const badge = sessionStatusColor[status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, ${timeLabel}, ${rightLabel}, ${badge.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderColor: theme.cardBorder }, pressed && styles.pressed]}
    >
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={18} color={color.inkSoft} />
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        {status === 'DIBUKA' && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.bottomRow}>
        <Text style={styles.meta} numberOfLines={1}>{timeLabel}</Text>
        <Text style={[styles.meta, styles.metaRight]} numberOfLines={1}>{rightLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderRadius: radius.card,
    paddingHorizontal: 21,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: { flex: 1, fontFamily: font.regular, fontSize: 12, color: color.inkSoft },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.ink },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { fontFamily: font.regular, fontSize: 16, color: color.inkSoft },
  metaRight: { flex: 1, textAlign: 'right' },
});
