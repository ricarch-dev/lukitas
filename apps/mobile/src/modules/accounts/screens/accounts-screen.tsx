import { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { dashboardDisclosure } from '../../../shared/presentation/financial-disclosure';
import { useDashboard } from '../../../shared/hooks/use-dashboard';
import {
  activeDashboardAccounts,
  groupedDashboardAccounts,
} from '../../../shared/presentation/dashboard-layout';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import {
  ACCOUNT_CURRENCY_FILTERS,
  type AccountsCurrencySelection,
} from '../presentation/accounts-overview';
import { styles } from '../styles/accounts-overview-styles';
import { BalanceSummary } from '../../home/components/balance-summary';

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const [accountCurrency, setAccountCurrency] = useState<AccountsCurrencySelection>(null);
  const { dashboard, error, isLoading } = useDashboard(accountCurrency ?? undefined);
  const accounts = dashboard ? activeDashboardAccounts(dashboard) : [];
  const groups = groupedDashboardAccounts(accounts);
  const disclosure = dashboard ? dashboardDisclosure(dashboard) : null;

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.page}
        style={styles.scroll}
      >
        <View style={styles.content}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Filtrar cuentas por moneda"
            style={styles.filters}
          >
            {ACCOUNT_CURRENCY_FILTERS.map((filter) => {
              const selected = accountCurrency === filter.value;
              return (
                <Pressable
                  key={filter.value ?? 'all'}
                  accessibilityRole="radio"
                  accessibilityLabel={filter.accessibilityLabel}
                  accessibilityState={{ selected }}
                  onPress={() => setAccountCurrency(filter.value)}
                  style={({ pressed }) => [
                    styles.filterOption,
                    selected && styles.filterOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.state}>
              <Text accessibilityRole="alert" selectable style={styles.error}>
                {error}
              </Text>
            </View>
          ) : isLoading || !dashboard ? (
            <View style={styles.state}>
              <ActivityIndicator accessibilityLabel="Cargando cuentas" color={colors.primary} />
              <Text style={styles.loadingLabel}>Cargando tus cuentas…</Text>
            </View>
          ) : (
            <>
              <BalanceSummary dashboard={dashboard} showMonthlyComparison={false} />
              {disclosure?.balance || dashboard.totals.warnings.length ? (
                <View style={styles.warnings}>
                  {disclosure?.balance ? (
                    <Text selectable style={styles.warning}>
                      {disclosure.balance}
                    </Text>
                  ) : null}
                  {dashboard.totals.warnings.map((warning, index) => (
                    <Text key={`balance-${index}`} selectable style={styles.warning}>
                      {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Cuentas activas
                  </Text>
                  <Text
                    accessibilityLabel={`${accounts.length} cuentas activas`}
                    style={styles.accountCount}
                  >
                    {accounts.length}
                  </Text>
                </View>
                {groups.length ? (
                  <View accessibilityLabel="Lista de cuentas activas" style={styles.accountList}>
                    {groups.map((group) => (
                      <View key={group.id} style={styles.accountGroup}>
                        {group.name ? (
                          <Text accessibilityRole="header" style={styles.bankGroupName}>
                            {group.name}
                          </Text>
                        ) : null}
                        {group.accounts.map((account, index) => (
                          <View
                            key={account.id}
                            style={[
                              styles.accountRow,
                              index < group.accounts.length - 1 && styles.accountRowDivider,
                            ]}
                          >
                            <View style={styles.accountInfo}>
                              <Text numberOfLines={1} style={styles.accountName}>
                                {account.name}
                              </Text>
                              <Text style={styles.accountCurrency}>{account.currency.code}</Text>
                            </View>
                            <Text selectable style={styles.accountBalance}>
                              {account.balance} {account.currency.code}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No hay cuentas para este filtro.</Text>
                    <Text style={styles.emptyCopy}>
                      Agrega una cuenta para empezar a consultar tus saldos aquí.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <Link href="/crear-cuenta" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Agregar cuenta"
          accessibilityHint="Abre el formulario para registrar una cuenta manualmente."
          style={{ ...styles.addLink, bottom: Math.max(insets.bottom, 16) }}
        >
          <Plus size={18} color={colors.surface} />
        </Pressable>
      </Link>
    </View>
  );
}
