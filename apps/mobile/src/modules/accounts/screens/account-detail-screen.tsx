import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDashboard } from '../../../shared/hooks/use-dashboard';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';

export function AccountDetailScreen({ id }: { readonly id: string }) {
  const { dashboard, error, isLoading } = useDashboard();
  const account = dashboard?.accounts.find((item) => item.id === id && !item.archived);
  const activity = dashboard?.recentActivity ?? [];
  const recent = activity.filter((item) => item.accountId === id && !item.voidedAt);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.content}>
        {error ? (
          <Text accessibilityRole="alert" selectable style={styles.error}>
            {error}
          </Text>
        ) : isLoading || !dashboard ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.body}>Cargando cuenta…</Text>
          </View>
        ) : !account ? (
          <Text accessibilityRole="alert" style={styles.error}>
            Esta cuenta no está disponible. Vuelve a Cuentas para elegir una cuenta activa.
          </Text>
        ) : (
          <>
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={styles.title}>
                {account.bankGroup?.name ?? account.name}
              </Text>
              {account.bankGroup ? <Text style={styles.body}>{account.name}</Text> : null}
              <Text style={styles.label}>Balance disponible · {account.currency.code}</Text>
              <Text selectable style={styles.amount}>
                {account.balance} {account.currency.code}
              </Text>
            </View>
            <View style={styles.panel}>
              <Text style={styles.label}>Saldo inicial</Text>
              <Text selectable style={styles.value}>
                {account.openingBalance} {account.currency.code}
              </Text>
              <Text style={styles.body}>
                Cada moneda tiene una cuenta y un saldo independientes.
              </Text>
            </View>
            <View style={styles.history}>
              <Text accessibilityRole="header" style={styles.heading}>
                Movimientos recientes
              </Text>
              <Text style={styles.body}>
                Se muestran los movimientos disponibles del período actual. Este resumen no es el
                historial completo.
              </Text>
              {recent.length ? (
                recent.map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <View style={styles.activityDescription}>
                      <Text style={styles.value}>
                        {item.note ||
                          (item.kind === 'INCOME'
                            ? 'Ingreso'
                            : item.kind === 'EXPENSE'
                              ? 'Egreso'
                              : 'Saldo inicial')}
                      </Text>
                      <Text style={styles.body}>{item.occurredAt.slice(0, 10)}</Text>
                    </View>
                    <Text selectable style={styles.value}>
                      {item.kind === 'EXPENSE' ? '−' : '+'}
                      {item.amount} {item.currencyCode}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.value}>Sin movimientos en este resumen</Text>
                  <Text style={styles.body}>
                    No aparecen movimientos recientes de esta cuenta en el período actual.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.canvas, padding: 20, paddingBottom: 72 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 720, gap: 24 },
  loading: { alignItems: 'center', gap: 12, padding: 24 },
  error: {
    backgroundColor: colors.errorSurface,
    borderRadius: 12,
    color: colors.error,
    padding: 16,
  },
  intro: { gap: 10, paddingVertical: 14 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  label: { color: colors.body, fontSize: 14, fontWeight: '600' },
  amount: { color: colors.ink, fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  value: { color: colors.ink, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { color: colors.body, fontSize: 14, lineHeight: 21 },
  heading: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  history: { gap: 12 },
  activityRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
  },
  activityDescription: { flex: 1, gap: 4 },
});
