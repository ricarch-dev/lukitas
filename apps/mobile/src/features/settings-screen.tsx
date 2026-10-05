import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSession } from '../session/SessionContext';
import { AUTH_COLORS as colors } from './auth-screen-theme';

export function SettingsScreen() {
  const { setTokens } = useSession();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Ajustes
      </Text>
      <Text style={styles.body}>
        Tu sesión se guarda en este dispositivo para que puedas volver a tus finanzas.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void setTokens(null)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, gap: 18, padding: 24, backgroundColor: colors.canvas },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  body: { color: colors.body, fontSize: 16, lineHeight: 24 },
  button: { backgroundColor: colors.surface, borderRadius: 10, padding: 16, minHeight: 48 },
  buttonText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
