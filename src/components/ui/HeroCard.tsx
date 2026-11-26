import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { images } from '../../theme/assets';
import { font, radius, roleTheme } from '../../theme/tokens';

// ===== Posisi maskot (dari Figma, kartu 354 x 194) =====
// Kalau maskot terlihat terlalu tinggi/rendah, ubah MASCOT.bottom:
// angka lebih kecil (lebih negatif) = maskot turun.
// Gambar mascot-hero.png = ekspor bingkai "Group 4 1" (sudah utuh & sudah diputar),
// jadi di sini cukup diletakkan; tidak perlu dipotong atau diputar lagi.
const MASCOT = {
  width: 200,
  height: 221,
  left: 166, // jarak dari tepi kiri kartu
  // Diukur dari TEPI BAWAH kartu (sama seperti kaki), supaya wajah dan kaki tetap
  // menempel walaupun kartu lebih tinggi karena teksnya dua baris.
  // Negatif = bagian bawah gambar keluar di bawah kartu (tertutup kaki).
  // Dari Figma: maskot top -22 & tinggi 221 pada kartu 194 -> bottom -5
  // (praktikan dan asisten sama posisinya).
  bottom: { praktikan: -5, asisten: -5 },
};
// Kaki maskot menutupi bagian bawah wajah dan tepi bawah kartu.
const PAWS = [{ left: 184 }, { left: 271 }];
const PAW = { width: 51, height: 40, bottom: -14 };

// Kartu oranye di beranda: tanggal, ringkasan hari ini, tombol aksi, dan maskot.
export function HeroCard({ dayLabel, dateLabel, summary, highlight, actionLabel, onAction, variant = 'praktikan' }: {
  variant?: 'praktikan' | 'asisten'; // warna kartu & maskot (asisten: berkacamata, kartu mint)
  dayLabel: string;
  dateLabel: string;
  summary: string;
  highlight?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = roleTheme[variant];
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: theme.heroBg }]}>
        <View style={styles.texts}>
          <Text style={[styles.date, { color: theme.heroText }]}>
            {dayLabel},{'\n'}{dateLabel}
          </Text>
          <Text style={[styles.summary, { color: theme.heroText }]} numberOfLines={2}>
            {summary}
            {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
          </Text>
          {actionLabel && onAction && (
            <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.action}>
              <Text style={[styles.actionText, { color: theme.heroText }]}>{actionLabel}</Text>
              <Feather name="chevron-right" size={18} color={theme.heroText} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Lapisan maskot selebar kartu, supaya posisinya mengikuti koordinat Figma. */}
      <View style={styles.mascotLayer} pointerEvents="none">
        <View style={styles.mascotArea}>
          <Image
            source={variant === 'asisten' ? images.mascotHeroAsisten : images.mascotHero}
            resizeMode="contain"
            style={[styles.mascot, { bottom: MASCOT.bottom[variant] }]}
          />
          {PAWS.map((paw) => (
            <Image key={paw.left} source={images.mascotPaw} style={[styles.paw, { left: paw.left }]} resizeMode="contain" />
          ))}
        </View>
      </View>
    </View>
  );
}

// Lebar kartu di Figma. Pada layar yang lebih sempit/lebar, area maskot
// ditempel ke kanan kartu sehingga jarak ke tepi kanan tetap sama seperti Figma.
const FIGMA_CARD_WIDTH = 354;

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginTop: 28, marginBottom: 14 },
  card: {
    minHeight: 194,
    borderRadius: radius.card,
    paddingVertical: 22,
    paddingLeft: 25,
    paddingRight: FIGMA_CARD_WIDTH - MASCOT.left + 6,
    justifyContent: 'center',
  },
  texts: { gap: 8 },
  date: { fontFamily: font.display, fontSize: 32, lineHeight: 36 },
  summary: { fontFamily: font.display, fontSize: 14, lineHeight: 19 },
  highlight: { textDecorationLine: 'underline' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
  actionText: { fontFamily: font.semiboldItalic, fontSize: 15 },
  mascotLayer: { position: 'absolute', top: 0, bottom: 0, right: 0, width: FIGMA_CARD_WIDTH },
  mascotArea: { flex: 1 },
  mascot: {
    position: 'absolute',
    width: MASCOT.width,
    height: MASCOT.height,
    left: MASCOT.left,
  },
  paw: { position: 'absolute', width: PAW.width, height: PAW.height, bottom: PAW.bottom },
});
