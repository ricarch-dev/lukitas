import type { DebtsOverviewDto } from '@lukitas/contracts';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useDebtData } from '../hooks/use-debt-data';
import { styles } from '../styles/debt-styles';

export function DebtSummary() {
  const { data, loading, error } = useDebtData<DebtsOverviewDto>('/debts');
  return (
    <Link href="/deudas" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Ver deudas y préstamos"
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <Text style={styles.subtitle}>Deudas y préstamos</Text>
        {loading ? (
          <Text style={styles.hint}>Cargando saldos pendientes…</Text>
        ) : error ? (
          <Text style={styles.hint}>
            No se pudieron cargar los pendientes. Toca para reintentar.
          </Text>
        ) : data?.totals.length ? (
          data.totals.map((total) => (
            <View key={total.currencyCode} style={styles.group}>
              <Text style={styles.label}>{total.currencyCode}</Text>
              <View style={styles.row}>
                <Text style={styles.body}>
                  Debes {total.payable} {total.currencyCode}
                </Text>
                <Text style={styles.body}>
                  Te deben {total.receivable} {total.currencyCode}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.body}>Sin deudas ni préstamos registrados.</Text>
        )}
        <Text style={styles.hint}>Separados de tu dinero disponible · Ver detalles</Text>
      </Pressable>
    </Link>
  );
}
