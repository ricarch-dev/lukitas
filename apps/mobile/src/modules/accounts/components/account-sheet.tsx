import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  children: ReactNode;
};

export function AccountSheet({ visible, title, onClose, onConfirm, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Cerrar panel"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} accessible={false} />
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>×</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {onConfirm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar monto"
                onPress={onConfirm}
                style={[styles.headerButton, styles.confirm]}
              >
                <Text style={styles.confirmText}>✓</Text>
              </Pressable>
            ) : (
              <View style={styles.headerButton} />
            )}
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(25, 45, 48, 0.35)' },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
    maxHeight: '88%',
    maxWidth: 560,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.fieldBorder,
    borderRadius: 3,
    height: 4,
    width: 38,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  headerButtonText: { color: colors.ink, fontSize: 28, lineHeight: 34 },
  confirm: { backgroundColor: colors.primary },
  confirmText: { color: colors.surface, fontSize: 24, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
