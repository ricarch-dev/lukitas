import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';

export function SettingsScreen() {
  const { setTokens } = useSession();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Ajustes
      </Text>
      <View style={styles.sessionSection}>
        <Text style={styles.sectionTitle}>Sesión en este dispositivo</Text>
        <Text style={styles.body}>
          Tu sesión se guarda en este dispositivo para que puedas volver a tus finanzas.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void setTokens(null)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    backgroundColor: colors.canvas,
    flexGrow: 1,
    gap: 20,
    maxWidth: 760,
    padding: 24,
    width: '100%',
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  body: { color: colors.body, fontSize: 16, lineHeight: 24 },
  sessionSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  button: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  buttonPressed: { backgroundColor: colors.softSurface },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
