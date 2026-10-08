import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { useDashboard } from '../../../shared/hooks/use-dashboard';

export function MovementsScreen() {
  const { dashboard, error } = useDashboard();
  if (error)
    return (
      <View style={styles.state}>
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      </View>
    );
  if (!dashboard)
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.context}>Cargando tus movimientos…</Text>
      </View>
    );
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Movimientos recientes
          </Text>
          <Text style={styles.context}>
            Actividad reciente de tus cuentas. Este listado no incluye todo el historial.
          </Text>
        </View>
        {dashboard.recentActivity.length ? (
          <View style={styles.list}>
            {dashboard.recentActivity.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.row,
                  index < dashboard.recentActivity.length - 1 && styles.rowBorder,
                ]}
              >
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
                <Text
                  selectable
                  style={[styles.amount, item.kind === 'EXPENSE' ? styles.expense : styles.income]}
                >
                  {item.kind === 'EXPENSE' ? '−' : '+'}
                  {item.amount} {item.currencyCode}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todavía no hay movimientos recientes.</Text>
            <Text style={styles.context}>Los movimientos registrados aparecerán aquí.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.canvas,
  },
  page: { flexGrow: 1, backgroundColor: colors.canvas, padding: 24, paddingBottom: 48 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 24 },
  heading: { gap: 8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  context: { color: colors.body, fontSize: 14, lineHeight: 21 },
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  details: { flexShrink: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 15, fontWeight: '700', flexShrink: 1, fontVariant: ['tabular-nums'] },
  income: { color: colors.income },
  expense: { color: colors.expense },
  emptyState: { backgroundColor: colors.softSurface, borderRadius: 12, gap: 8, padding: 18 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  error: { color: colors.error },
});
