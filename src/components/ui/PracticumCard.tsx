import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius, roleTheme, RoleTone, sessionStatusColor } from '../../theme/tokens';
import { SessionStatus } from '../../types';
import { PillButton } from './PillButton';

type Action = { label: string; onPress: () => void; disabled?: boolean };

// Kartu sesi praktikum (Figma: kotak abu bergaris warna tema, dua tombol).
export function PracticumCard({ title, location, timeLabel, status, note, primary, secondary, tone = 'praktikan' }: {
  title: string;
  location: string;
  timeLabel: string;
  status: SessionStatus;
  note?: string; // misalnya "Sudah hadir" atau "12/20 hadir"
  primary: Action;
  secondary: Action;
  tone?: RoleTone;
}) {
  const theme = roleTheme[tone];
  const badge = sessionStatusColor[status];
  return (
    <View style={[styles.card, { borderColor: theme.cardBorder }]}>
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={18} color={color.inkSoft} />
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.time} numberOfLines={1}>{timeLabel}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{note ?? badge.label}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PillButton tone={tone} label={primary.label} onPress={primary.onPress} disabled={primary.disabled} />
        <PillButton tone={tone} label={secondary.label} onPress={secondary.onPress} disabled={secondary.disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderRadius: radius.card,
    paddingHorizontal: 11,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 6,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9 },
  location: { flex: 1, fontFamily: font.regular, fontSize: 15, color: color.inkSoft },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 30, color: color.ink, paddingHorizontal: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13 },
  time: { flex: 1, fontFamily: font.medium, fontSize: 12, color: color.muted },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: font.semibold, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
