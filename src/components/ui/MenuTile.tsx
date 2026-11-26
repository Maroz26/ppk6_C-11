import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MenuIconName, menuIcons } from '../../theme/assets';
import { radius, roleTheme, RoleTone } from '../../theme/tokens';

export type MenuItem = {
  key: string;
  label: string;
  // Ikon PNG dari Figma. Kalau belum ada, pakai ikon Feather sebagai pengganti sementara.
  icon?: MenuIconName;
  feather?: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

// Kotak 90x90 berisi ikon, dengan label di bawahnya (Figma: Home Screen).
export function MenuTile({ item, tone = 'praktikan' }: { item: MenuItem; tone?: RoleTone }) {
  const theme = roleTheme[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={item.onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: theme.tileBg }]}>
        {item.icon ? (
          <Image
            source={menuIcons[item.icon]}
            style={[styles.icon, theme.iconTint ? { tintColor: theme.iconTint } : null]}
            resizeMode="contain"
          />
        ) : item.feather ? (
          <Feather name={item.feather} size={46} color={theme.iconTint ?? '#5E3F70'} />
        ) : null}
      </View>
      <Text style={[styles.label, { color: theme.tileLabel }]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );
}

// Tiga kolom; jarak antar kotak menyesuaikan lebar layar.
export function MenuGrid({ items, tone = 'praktikan' }: { items: MenuItem[]; tone?: RoleTone }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <MenuTile key={item.key} item={item} tone={tone} />
      ))}
    </View>
  );
}

const TILE = 90;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    paddingHorizontal: 17,
  },
  wrap: { width: TILE + 10, alignItems: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 54, height: 54 },
  label: { marginTop: 8, fontFamily: 'Poppins_500Medium', fontSize: 12 },
});
