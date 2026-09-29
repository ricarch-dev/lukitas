import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AUTH_COLORS as colors } from './auth-screen-theme';
import { useDashboard } from './use-dashboard';

export function MovementsScreen() {
  const { dashboard, error } = useDashboard();
  if (error)
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      </View>
    );
  if (!dashboard)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>
        Movimientos recientes
      </Text>
      <Text style={styles.context}>
        Actividad reciente de tus cuentas. Este listado no incluye todo el historial.
      </Text>
      {dashboard.recentActivity.length ? (
        dashboard.recentActivity.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.details}>
              <Text style={styles.name}>
                {item.kind === 'INCOME'
                  ? 'Ingreso'
                  : item.kind === 'EXPENSE'
                    ? 'Gasto'
                    : 'Saldo inicial'}
              </Text>
              <Text style={styles.context}>{item.note || item.occurredAt.slice(0, 10)}</Text>
            </View>
            <Text selectable style={styles.amount}>
              {item.kind === 'EXPENSE' ? '−' : '+'}
              {item.amount} {item.currencyCode}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.context}>Todavía no hay movimientos recientes.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { flexGrow: 1, backgroundColor: colors.canvas, padding: 24, paddingBottom: 48, gap: 16 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  context: { color: colors.body, fontSize: 14, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  details: { flexShrink: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  amount: { color: colors.ink, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  error: { color: colors.error },
});
