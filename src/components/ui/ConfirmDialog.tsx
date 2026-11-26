import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../../theme/tokens';

// Dialog konfirmasi bergaya ASSIST (dipakai untuk buka/tutup sesi, hapus, dll).
export function ConfirmDialog({ visible, title, message, confirmLabel, danger, busy, error, onConfirm, onCancel }: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: danger ? color.danger : color.purpleDeep },
                (pressed || busy) && styles.pressed,
              ]}
            >
              <Text style={styles.confirmText}>{busy ? 'Memproses...' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(54,54,54,0.55)' },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 3,
    borderColor: color.lavender,
    padding: 20,
    gap: 8,
  },
  title: { fontFamily: font.display, fontSize: 22, color: color.ink },
  message: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: color.inkSoft },
  error: {
    fontFamily: font.medium, fontSize: 12, lineHeight: 18, color: color.danger,
    backgroundColor: color.dangerSoft, borderRadius: radius.sm, padding: 10,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: { flex: 1, minHeight: 46, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: color.lavenderSoft },
  cancelText: { fontFamily: font.semibold, fontSize: 14, color: color.purpleInk },
  confirmText: { fontFamily: font.semibold, fontSize: 14, color: color.onDark },
  pressed: { opacity: 0.75 },
});
