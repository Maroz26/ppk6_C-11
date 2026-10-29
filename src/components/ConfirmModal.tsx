import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.icon, danger && styles.dangerIcon]}>
            <Ionicons
              name={danger ? 'calendar-clear-outline' : 'calendar-outline'}
              size={24}
              color={danger ? '#A64F58' : '#087F5B'}
            />
          </View>

          <Text style={styles.kicker}>KONFIRMASI TINDAKAN</Text>

          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>

          {!!message && (
            <Text style={styles.message}>{message}</Text>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancel,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                danger ? styles.danger : styles.primary,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.confirmText,
                  danger && styles.dangerConfirmText,
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 25, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFEFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8DFD1',
    padding: 24,
    gap: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#E5F2EB',
    borderWidth: 1,
    borderColor: '#C8DFD1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dangerIcon: {
    backgroundColor: '#FBF3F3',
    borderColor: '#E9D1D3',
  },
  kicker: {
    color: '#537366',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    color: '#17382D',
  },
  message: {
    fontSize: 12,
    color: '#68786F',
    lineHeight: 19,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancel: {
    backgroundColor: '#F1F5F2',
    borderWidth: 1,
    borderColor: '#D5E4DB',
  },
  primary: {
    backgroundColor: '#087F5B',
  },
  danger: {
    backgroundColor: '#A64F58',
    borderWidth: 1,
    borderColor: '#A64F58',
  },
  pressed: {
    opacity: 0.75,
  },
  cancelText: {
    color: '#34483D',
    fontWeight: '700',
    fontSize: 12,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  dangerConfirmText: {
    color: '#FFFFFF',
  },
});