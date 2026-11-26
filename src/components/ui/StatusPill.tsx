import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  success: { bg: color.successSoft, fg: color.success },
  warning: { bg: color.warningSoft, fg: color.warning },
  danger: { bg: color.dangerSoft, fg: color.danger },
  info: { bg: color.lavenderSoft, fg: color.purpleInk },
  neutral: { bg: color.dayBg, fg: color.muted },
};

// Label status kecil berbentuk pil (Hadir, Izin, Menunggu, Ditolak, dll).
export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  text: { fontFamily: font.semibold, fontSize: 12 },
});
