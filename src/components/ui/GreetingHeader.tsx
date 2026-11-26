import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { images } from '../../theme/assets';
import { color, font, roleTheme, RoleTone } from '../../theme/tokens';

// Header beranda: kepala maskot, "Hi, Nama!", NIM, dan lonceng.
export function GreetingHeader({ name, subtitle, onBellPress, badge = 0, tone = 'praktikan' }: {
  name: string;
  subtitle: string;
  onBellPress?: () => void;
  badge?: number; // jumlah pemberitahuan baru; 0 = tanpa penanda
  tone?: RoleTone;
}) {
  const theme = roleTheme[tone];
  const firstName = name.trim().split(/\s+/)[0] || name;
  return (
    <View style={styles.row}>
      <Image source={images.mascotHead} style={styles.mascot} resizeMode="contain" />
      <View style={styles.texts}>
        <Text style={[styles.hi, { color: theme.greeting }]} numberOfLines={1}>
          Hi, <Text style={styles.name}>{firstName}</Text>!
        </Text>
        <Text style={[styles.sub, { color: theme.greeting }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {onBellPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={badge > 0 ? `Pemberitahuan, ${badge} baru` : 'Pemberitahuan'}
          onPress={onBellPress}
          hitSlop={10}
        >
          <Feather name="bell" size={26} color={theme.bell} />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Gambar diekspor dengan ruang bayangan, jadi kotaknya lebih besar dari maskotnya.
  mascot: { width: 77, height: 70, marginLeft: -14 },
  texts: { flex: 1 },
  hi: { fontFamily: font.display, fontSize: 24 },
  name: { textDecorationLine: 'underline' },
  sub: { fontFamily: font.display, fontSize: 15, marginTop: -2 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.danger,
    borderWidth: 2,
    borderColor: color.card,
  },
  badgeText: { fontFamily: font.bold, fontSize: 10, color: color.onDark },
});
