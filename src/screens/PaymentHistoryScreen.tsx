// src/screens/PaymentHistoryScreen.tsx
// Riwayat Pembayaran (praktikan): semua transaksi denda via Midtrans beserta statusnya.
// Data dibaca realtime dari koleksi payments (ditulis server), jadi tetap ada walau
// aplikasi ditutup lalu dibuka lagi, dan status berubah otomatis saat webhook masuk.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { DecoratedScreen } from '../components/ui/DecoratedScreen';
import { PillTone, StatusPill } from '../components/ui/StatusPill';
import { useApp } from '../context/AppContext';
import {
  formatRupiah,
  listenMyPayments,
  PAYMENT_STATUS_LABEL,
  paymentTypeLabel,
} from '../services/paymentService';
import { color, font, radius } from '../theme/tokens';
import { Payment, PaymentStatus } from '../types';
import { formatJam, formatTanggal } from '../utils/formatTime';

type Filter = 'ALL' | PaymentStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'SUCCESS', label: 'Berhasil' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'FAILED', label: 'Gagal' },
];

const STATUS_TONE: Record<PaymentStatus, PillTone> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

const tanggalJam = (iso: string | null) => (iso ? `${formatTanggal(iso)}, ${formatJam(iso)}` : '-');

export default function PaymentHistoryScreen() {
  const { currentUser } = useApp();
  const uid = currentUser?.id;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    if (!uid) return undefined;
    setLoading(true);
    return listenMyPayments(
      uid,
      (list) => {
        setPayments(list);
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Gagal memuat riwayat pembayaran. Periksa koneksi internet.');
        setLoading(false);
      },
    );
  }, [uid]);

  const shown = useMemo(
    () => (filter === 'ALL' ? payments : payments.filter((p) => p.status === filter)),
    [payments, filter],
  );
  const success = payments.filter((p) => p.status === 'SUCCESS');
  const totalPaid = success.reduce((sum, p) => sum + (p.nominal || 0), 0);

  return (
    <DecoratedScreen title="Riwayat Pembayaran" tone="praktikan">
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total denda dibayar</Text>
        <Text style={styles.summaryValue}>{formatRupiah(totalPaid)}</Text>
        <Text style={styles.summaryNote}>
          {success.length} transaksi berhasil dari {payments.length} transaksi
        </Text>
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={color.purpleDeep} />
      ) : shown.length === 0 ? (
        <Text style={styles.helper}>
          {payments.length === 0
            ? 'Belum ada transaksi. Riwayat muncul setelah kamu menekan tombol Bayar pada tagihan denda.'
            : 'Tidak ada transaksi dengan status ini.'}
        </Text>
      ) : (
        shown.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={1}>{p.praktikum}</Text>
              <StatusPill label={PAYMENT_STATUS_LABEL[p.status]} tone={STATUS_TONE[p.status]} />
            </View>
            <Text style={styles.amount}>{formatRupiah(p.nominal)}</Text>

            <View style={styles.rows}>
              <Row label="Sesi" value={`Pertemuan ${p.pertemuan}`} />
              <Row label="Tanggal tagihan" value={tanggalJam(p.tagihanPada)} />
              <Row label="Waktu transaksi" value={tanggalJam(p.transaksiPada ?? p.dibuatPada)} />
              <Row label="Metode" value={paymentTypeLabel(p.paymentType)} />
              {p.status === 'FAILED' && (
                <Row label="Keterangan" value={p.midtransStatus === 'expire' ? 'Kedaluwarsa' : 'Gagal / dibatalkan'} />
              )}
            </View>
            <Text style={styles.orderId} selectable>ID: {p.id}</Text>
          </View>
        ))
      )}
    </DecoratedScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: color.card,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 20,
    gap: 4,
  },
  summaryLabel: { fontFamily: font.medium, fontSize: 14, color: color.inkSoft },
  summaryValue: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: color.plum },
  summaryNote: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.lavenderSoft,
  },
  chipActive: { backgroundColor: color.plum },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: color.purpleInk },
  chipTextActive: { color: color.onDark },

  helper: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  error: {
    fontFamily: font.medium,
    fontSize: 13,
    color: color.danger,
    backgroundColor: color.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
  },

  card: {
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.lavender,
    borderRadius: radius.card,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontFamily: font.display, fontSize: 20, color: color.ink },
  amount: { fontFamily: font.display, fontSize: 22, color: color.plum },
  rows: { marginTop: 6, borderTopWidth: 1, borderTopColor: color.divider, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 10 },
  rowLabel: { width: 112, fontFamily: font.regular, fontSize: 12, color: color.muted },
  rowValue: { flex: 1, fontFamily: font.medium, fontSize: 12, color: color.ink, textAlign: 'right' },
  orderId: { marginTop: 4, fontFamily: font.regular, fontSize: 10, color: color.placeholder },
});