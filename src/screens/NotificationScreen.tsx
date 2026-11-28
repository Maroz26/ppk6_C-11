// src/screens/NotificationScreen.tsx
// Halaman Pemberitahuan (dibuka dari lonceng di beranda). Dipakai kedua peran.
// Isinya disusun oleh useNotifications dari data yang sudah ada di Firestore.
// Saat halaman ditinggalkan, semua pemberitahuan ditandai sudah dibaca.
import { Feather } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { useApp } from '../context/AppContext';
import { markNotificationsSeen, NotifKind, useNotifications } from '../hooks/useNotifications';
import { color, font, radius } from '../theme/tokens';
import { waktuRelatif } from '../utils/dateId';

const KIND: Record<NotifKind, { icon: keyof typeof Feather.glyphMap; bg: string; fg: string }> = {
  presensi: { icon: 'map-pin', bg: color.successSoft, fg: color.success },
  pengingat: { icon: 'clock', bg: color.lavenderSoft, fg: color.purpleInk },
  jadwal: { icon: 'alert-circle', bg: color.warningSoft, fg: color.warning },
  izin: { icon: 'file-text', bg: color.warningSoft, fg: color.warning },
  izinDiterima: { icon: 'check-circle', bg: color.successSoft, fg: color.success },
  izinDitolak: { icon: 'x-circle', bg: color.dangerSoft, fg: color.danger },
  alpa: { icon: 'user-x', bg: color.dangerSoft, fg: color.danger },
  ulasan: { icon: 'message-circle', bg: color.lavenderSoft, fg: color.purpleInk },
  // Sprint 4
  denda: { icon: 'credit-card', bg: color.dangerSoft, fg: color.danger },
  bayarBerhasil: { icon: 'check-circle', bg: color.successSoft, fg: color.success },
  bayarGagal: { icon: 'x-circle', bg: color.dangerSoft, fg: color.danger },
};

export default function NotificationScreen() {
  const { currentUser, role } = useApp();
  const { items, isUnread, unreadCount, now } = useNotifications();
  const uid = currentUser?.id;

  // Tandai sudah dibaca saat halaman ditutup, supaya penanda "baru" masih terlihat selama dibuka.
  useEffect(() => {
    return () => {
      if (uid) markNotificationsSeen(uid);
    };
  }, [uid]);

  return (
    <DecoratedScreen title="Pemberitahuan" tone={role === 'ASISTEN' ? 'asisten' : 'praktikan'}>
      {unreadCount > 0 && (
        <Text style={styles.count}>{unreadCount} pemberitahuan baru</Text>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Belum ada pemberitahuan</Text>
          <Text style={styles.helper}>
            {role === 'ASISTEN'
              ? 'Izin baru, pengingat mengajar, dan ulasan baru akan muncul di sini.'
              : 'Presensi yang dibuka, pengingat praktikum, keputusan izin, tagihan denda, dan status pembayaran akan muncul di sini.'}
          </Text>
        </View>
      ) : (
        items.map((n) => {
          const k = KIND[n.kind];
          const unread = isUnread(n);
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Baru. ' : ''}${n.title}. ${n.body}`}
              onPress={() => router.push(n.href as Href)}
              style={({ pressed }) => [styles.card, unread && styles.cardUnread, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: k.bg }]}>
                <Feather name={k.icon} size={20} color={k.fg} />
              </View>
              <View style={styles.flex}>
                <View style={styles.top}>
                  <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                  {unread && <View style={styles.dot} />}
                </View>
                <Text style={styles.body} numberOfLines={3}>{n.body}</Text>
                <Text style={styles.time}>{waktuRelatif(n.time, now)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </DecoratedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  count: { fontFamily: font.semibold, fontSize: 13, color: color.ink, backgroundColor: color.card, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
  empty: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 3, borderColor: color.lavender, padding: 22, gap: 6 },
  emptyTitle: { fontFamily: font.display, fontSize: 20, color: color.ink },
  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 14,
  },
  cardUnread: { borderColor: color.orange },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: color.ink },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.orangeDark, marginTop: 5 },
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.inkSoft, marginTop: 2 },
  time: { fontFamily: font.regular, fontSize: 11, color: color.muted, marginTop: 4 },
});