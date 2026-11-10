import React from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useDashboard } from '../../../shared/hooks/use-dashboard';
import { dashboardDisclosure } from '../../../shared/presentation/financial-disclosure';
import {
  activeDashboardAccounts,
  groupedDashboardAccounts,
  homeDashboardLayout,
} from '../../../shared/presentation/dashboard-layout';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { styles } from '../styles/home-dashboard-styles';
import {
  ArrowUpDown,
  Clock4,
  Ellipsis,
  MoveDown,
  MoveUp,
  Plus,
  WalletCards,
} from 'lucide-react-native';
import { BalanceSummary } from '../components/balance-summary';

const dashboardShortcuts = [
  {
    href: '/(tabs)/movimientos',
    label: 'Movimientos',
    hint: 'Abre la pestaña de movimientos recientes.',
    glyph: <ArrowUpDown />,
  },
  {
    href: '/(tabs)/planificacion',
    label: 'Planificación',
    hint: 'Abre la pestaña de planificación.',
    glyph: <Clock4 />,
  },
  {
    href: '/(tabs)/ajustes',
    label: 'Ajustes',
    hint: 'Abre la pestaña de ajustes.',
    glyph: <Ellipsis />,
  },
  {
    href: '/cuentas',
    label: 'Cuentas',
    hint: 'Abre la vista de cuentas activas y sus saldos.',
    glyph: <WalletCards />,
  },
] as const;

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { wide, gutter, contentWidth } = homeDashboardLayout(width);
  const { dashboard, error } = useDashboard();
  if (error)
    return (
      <View style={[styles.center, styles.canvas]}>
        <Text selectable accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      </View>
    );
  if (!dashboard)
    return (
      <View style={[styles.center, styles.canvas]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingLabel}>Cargando tu resumen…</Text>
      </View>
    );
  const accounts = activeDashboardAccounts(dashboard);
  const disclosure = dashboardDisclosure(dashboard);
  const accountBalances = groupedDashboardAccounts(accounts).map((group) => (
    <View key={group.id} style={[styles.accountGroup, wide && styles.accountGroupWide]}>
      {group.name ? (
        <Text accessibilityRole="header" style={styles.bankName}>
          {group.name}
        </Text>
      ) : null}
      {group.accounts.map((account) => (
        <View key={account.id} style={[styles.account, wide && styles.accountWide]}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountName} numberOfLines={1}>
              {account.name}
            </Text>
            <View style={styles.accountCurrencyTag}>
              <Text style={styles.accountCurrencyTagText}>{account.currency.code}</Text>
            </View>
          </View>
          <Text style={styles.caption}>Saldo</Text>
          <Text selectable style={styles.value}>
            {account.balance} {account.currency.code}
          </Text>
        </View>
      ))}
    </View>
  ));
  return (
    <View style={styles.dashboardRoot}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.canvas}
        contentContainerStyle={[styles.page, { paddingHorizontal: gutter }]}
      >
        <View style={[styles.content, { maxWidth: contentWidth }]}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>L</Text>
              </View>
              <View style={styles.brandWords}>
                <Text style={styles.brandName}>Lukitas</Text>
                <Text style={styles.brandCaption}>Tu resumen financiero</Text>
              </View>
            </View>
            <Text accessibilityRole="header" style={styles.pageLabel}>
              Inicio
            </Text>
          </View>
          <View style={[styles.columns, wide && styles.columnsWide]}>
            <View style={styles.primaryColumn}>
              <View style={[styles.summary, { paddingBottom: 0 }]}>
                <BalanceSummary dashboard={dashboard} />
                {disclosure.balance ? (
                  <Text selectable style={styles.warning}>
                    En {dashboard.baseCurrency}: {disclosure.balance}
                  </Text>
                ) : null}
                {dashboard.totals.warnings.map((warning, index) => (
                  <Text key={`balance-${index}`} selectable style={styles.warning}>
                    {warning}
                  </Text>
                ))}
              </View>
              <View style={styles.shortcutRow}>
                {dashboardShortcuts.map((shortcut) => (
                  <Link key={shortcut.href} href={shortcut.href} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={shortcut.label}
                      accessibilityHint={shortcut.hint}
                      style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
                    >
                      <View style={styles.shortcutIcon}>
                        <Text accessible={false} style={styles.shortcutGlyph}>
                          {shortcut.glyph}
                        </Text>
                      </View>
                      <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
              <View style={styles.section}>
                <View style={[styles.flow, wide && styles.flowWide]}>
                  <View style={[styles.flowItem, wide && styles.flowItemWide]}>
                    <View style={styles.flowItemHeading}>
                      <MoveUp aria-hidden={true} size={17} color={colors.income} />
                      <Text style={styles.caption}>Ingresos del período</Text>
                    </View>
                    <Text selectable style={[styles.value, styles.income]}>
                      {dashboard.flow.income} {dashboard.baseCurrency}
                    </Text>
                  </View>
                  <View style={[styles.flowItem, wide && styles.flowItemWide]}>
                    <View style={styles.flowItemHeading}>
                      <MoveDown aria-hidden={true} size={17} color={colors.expense} />
                      <Text style={styles.caption}>Gastos del período</Text>
                    </View>
                    <Text selectable style={[styles.value, styles.expense]}>
                      {dashboard.flow.expense} {dashboard.baseCurrency}
                    </Text>
                  </View>
                </View>
                {disclosure.flow ? (
                  <Text selectable style={styles.warning}>
                    {disclosure.flow}
                  </Text>
                ) : null}
                {dashboard.flow.warnings.map((warning, index) => (
                  <Text key={`flow-${index}`} selectable style={styles.warning}>
                    {warning}
                  </Text>
                ))}
              </View>
            </View>
            <View style={styles.secondaryColumn}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Mis balances
                  </Text>
                  <Text style={styles.accountCount}>{accounts.length}</Text>
                </View>
                {accounts.length && wide ? (
                  <View
                    style={styles.accountListWide}
                    accessibilityLabel="Saldos de tus cuentas activas"
                  >
                    {accountBalances}
                  </View>
                ) : accounts.length ? (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountList}
                    accessibilityLabel="Saldos de tus cuentas activas"
                  >
                    {accountBalances}
                  </ScrollView>
                ) : (
                  <Text style={styles.caption}>
                    Todavía no tienes cuentas activas. Cuando registres una cuenta, verás su saldo
                    aquí.
                  </Text>
                )}
              </View>
              <Link href="/informes" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityHint="Abre los informes del período."
                  style={({ pressed }) => [styles.reportsLink, pressed && styles.shortcutPressed]}
                >
                  <View style={styles.reportsMark}>
                    <Text accessible={false} style={styles.reportsMarkText}>
                      ↗
                    </Text>
                  </View>
                  <View style={styles.reportsCopy}>
                    <Text style={styles.reportsTitle}>Informes</Text>
                    <Text style={styles.reportsHint}>Consulta tus informes del período.</Text>
                  </View>
                  <Text accessible={false} style={styles.reportsChevron}>
                    ›
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
      <Link href="/crear-cuenta" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Agregar cuenta"
          accessibilityHint="Abre el formulario para registrar una cuenta manualmente."
          style={{ ...styles.floatingAdd, position: 'absolute', right: gutter }}
        >
          <Plus size={20} color="#fff" strokeWidth={2} />
        </Pressable>
      </Link>
    </View>
  );
}
