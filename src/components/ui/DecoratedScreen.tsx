import { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, RoleTone } from '../../theme/tokens';
import { BackHeader } from './BackHeader';
import { Hills } from './Hills';

// Kerangka halaman bergaya ASSIST: tombol kembali berbentuk pil, latar berwarna di atas,
// bukit dan awan putih yang ikut bergulir, lalu putih di bawahnya.
// - tone "praktikan": latar oranye, bukit cokelat (senada dengan halaman Jadwal).
// - tone "asisten": latar lavender, bukit ungu (senada dengan Kelola Sesi dan form sesi).
const FIGMA_WIDTH = 402;
const DECOR_TOP = 75;

export function DecoratedScreen({ title, tone, children, footer }: {
  title: string;
  tone: RoleTone;
  children: ReactNode;
  footer?: ReactNode; // tombol yang menempel di bawah layar (opsional)
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / FIGMA_WIDTH;
  const top = tone === 'praktikan' ? color.orange : color.lavender;
  const hill = tone === 'praktikan' ? color.brown : color.purple;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: top }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (footer ? 110 : 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topFill, { height: (DECOR_TOP + 140) * k, backgroundColor: top }]} pointerEvents="none" />
        <View style={[styles.decor, { top: DECOR_TOP * k }]} pointerEvents="none">
          <Hills preset="awan" hillColor={hill} />
        </View>

        <View style={styles.header}>
          <BackHeader title={title} variant={tone === 'praktikan' ? 'onOrange' : 'onLavender'} />
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, backgroundColor: color.background },
  topFill: { position: 'absolute', top: 0, left: 0, right: 0 },
  decor: { position: 'absolute', left: 0, right: 0 },
  header: { paddingHorizontal: 17, paddingTop: 12 },
  body: { paddingHorizontal: 24, paddingTop: 28, gap: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 27 },
});
