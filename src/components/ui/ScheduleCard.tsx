import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, roleTheme, RoleTone, sessionStatusColor } from '../../theme/tokens';
import { SessionStatus } from '../../types';

// Kartu jadwal (Figma: jadwal-prak dan Kelola Sesi).
// Seluruh kartu bisa ditekan untuk membuka detail sesi.
// Kalau onEdit diisi, muncul tombol pensil di kanan atas (halaman Kelola Sesi).
export function ScheduleCard({ title, location, timeLabel, rightLabel, status, onPress, onEdit, tone = 'praktikan', background = 'surface' }: {
  title: string;
  location: string;
  timeLabel: string; // "08:00 - 10:00" atau "Sel, 24 Nov · 08:00 - 10:00"
  rightLabel: string; // misalnya "Kelas C · P3"
  status: SessionStatus;
  onPress: () => void;
  onEdit?: () => void;
  tone?: RoleTone;
  background?: 'surface' | 'white';
}) {
  const theme = roleTheme[tone];
  const badge = sessionStatusColor[status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${location}, ${timeLabel}, ${rightLabel}, ${badge.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.cardBorder, backgroundColor: background === 'white' ? color.card : color.surface },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={18} color={color.inkSoft} />
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        {status === 'DIBUKA' && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        )}
        {onEdit && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ubah sesi ${title}`}
            onPress={onEdit}
            hitSlop={10}
            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
          >
            <Feather name="edit-2" size={20} color={color.ink} />
          </Pressable>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.bottomRow}>
        <Text style={[styles.meta, styles.metaLeft]} numberOfLines={1}>{timeLabel}</Text>
        <Text style={[styles.meta, styles.metaRight]} numberOfLines={1}>{rightLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  edit: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.ink },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { fontFamily: font.regular, fontSize: 14, color: color.inkSoft },
  metaLeft: { flex: 1 },
  metaRight: { flexShrink: 0, textAlign: 'right' },
});
