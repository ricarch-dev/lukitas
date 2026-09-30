import React from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useDashboard } from './use-dashboard';
import { dashboardDisclosure } from './financial-disclosure';
import { activeDashboardAccounts, groupedDashboardAccounts, homeDashboardLayout } from './home-dashboard-layout';

export { AuthScreen } from './auth-screen';
export { OnboardingScreen } from './onboarding-screen';

const colors = {
  canvas: '#101C20',
  surface: '#1B2A2E',
  raised: '#26373B',
  ink: '#F2F8F7',
  body: '#D4E2E1',
  muted: '#B4C8C7',
  primary: '#8FCBC5',
  brand: '#005864',
  border: '#3B5459',
  warning: '#F5CF86',
  error: '#FFB8AB',
} as const;

const dashboardShortcuts = [
  {
    href: '/(tabs)/movimientos',
    label: 'Movimientos',
    hint: 'Abre la pestaña de movimientos recientes.',
    glyph: '↕',
  },
  {
    href: '/(tabs)/planificacion',
    label: 'Planificación',
    hint: 'Abre la pestaña de planificación.',
    glyph: '◷',
  },
  {
    href: '/(tabs)/ajustes',
    label: 'Ajustes',
    hint: 'Abre la pestaña de ajustes.',
    glyph: '•••',
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
      {group.name ? <Text accessibilityRole="header" style={styles.bankName}>{group.name}</Text> : null}
      {group.accounts.map((account) => (
        <View key={account.id} style={[styles.account, wide && styles.accountWide]}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
            <View style={styles.accountCurrencyTag}>
              <Text style={styles.accountCurrencyTagText}>{account.currency.code}</Text>
            </View>
          </View>
          <Text style={styles.caption}>Saldo</Text>
          <Text selectable style={styles.value}>{account.balance} {account.currency.code}</Text>
        </View>
      ))}
    </View>
  ));
  return (
    <View style={styles.dashboardRoot}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.canvas} contentContainerStyle={[styles.page, { paddingHorizontal: gutter }]}>
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
          <Text accessibilityRole="header" style={styles.pageLabel}>Inicio</Text>
        </View>
        <View style={[styles.columns, wide && styles.columnsWide]}>
          <View style={styles.primaryColumn}>
            <View style={styles.summary}>
              <View style={styles.summaryMeta}>
                <Text style={styles.sectionLabel}>Saldo total</Text>
                <View style={styles.currencyTag}>
                  <Text style={styles.currencyTagText}>{dashboard.baseCurrency}</Text>
                </View>
              </View>
              <Text selectable style={styles.total}>
                {dashboard.totals.amount}{' '}
                <Text style={styles.totalCurrency}>{dashboard.baseCurrency}</Text>
              </Text>
              {disclosure.balance ? <Text selectable style={styles.warning}>{disclosure.balance}</Text> : null}
              {dashboard.totals.warnings.map((warning, index) => (
                <Text key={`balance-${index}`} selectable style={styles.warning}>{warning}</Text>
              ))}
            </View>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Este período</Text>
              <View style={[styles.flow, wide && styles.flowWide]}>
                <View style={[styles.flowItem, wide && styles.flowItemWide]}>
                  <View style={styles.flowItemHeading}>
                    <Text accessible={false} style={styles.flowSymbol}>↑</Text>
                    <Text style={styles.caption}>Ingresos del período</Text>
                  </View>
                  <Text selectable style={styles.value}>
                    {dashboard.flow.income} {dashboard.baseCurrency}
                  </Text>
                </View>
                <View style={[styles.flowItem, wide && styles.flowItemWide]}>
                  <View style={styles.flowItemHeading}>
                    <Text accessible={false} style={styles.flowSymbol}>↓</Text>
                    <Text style={styles.caption}>Gastos del período</Text>
                  </View>
                  <Text selectable style={styles.value}>
                    {dashboard.flow.expense} {dashboard.baseCurrency}
                  </Text>
                </View>
              </View>
              {disclosure.flow ? <Text selectable style={styles.warning}>{disclosure.flow}</Text> : null}
              {dashboard.flow.warnings.map((warning, index) => (
                <Text key={`flow-${index}`} selectable style={styles.warning}>{warning}</Text>
              ))}
            </View>
          </View>
          <View style={styles.secondaryColumn}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Cuentas activas</Text>
                <Text style={styles.accountCount}>{accounts.length}</Text>
              </View>
              {accounts.length && wide ? (
                <View style={styles.accountListWide} accessibilityLabel="Saldos de tus cuentas activas">
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
                <Text style={styles.caption}>Todavía no tienes cuentas activas. Cuando registres una cuenta, verás su saldo aquí.</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Accesos rápidos</Text>
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
                        <Text accessible={false} style={styles.shortcutGlyph}>{shortcut.glyph}</Text>
                      </View>
                      <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>
            <Link href="/informes" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityHint="Abre los informes del período."
                style={({ pressed }) => [styles.reportsLink, pressed && styles.shortcutPressed]}
              >
                <View style={styles.reportsMark}>
                  <Text accessible={false} style={styles.reportsMarkText}>↗</Text>
                </View>
                <View style={styles.reportsCopy}>
                  <Text style={styles.reportsTitle}>Informes</Text>
                  <Text style={styles.reportsHint}>Consulta tus informes del período.</Text>
                </View>
                <Text accessible={false} style={styles.reportsChevron}>›</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
    <Link href="/crear-cuenta" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Crear cuenta" accessibilityHint="Abre el formulario para agregar una cuenta." style={({ pressed }) => [styles.floatingAdd, { right: gutter }, pressed && styles.shortcutPressed]}>
        <Text accessible={false} style={styles.floatingAddText}>+</Text>
      </Pressable>
    </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardRoot: { flex: 1, backgroundColor: colors.canvas },
  floatingAdd: { position: 'absolute', bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  floatingAddText: { fontSize: 32, color: colors.canvas, lineHeight: 38, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingLabel: { color: colors.body, fontSize: 14 },
  canvas: { backgroundColor: colors.canvas },
  page: {
    flexGrow: 1,
    paddingTop: 14,
    paddingBottom: 100,
  },
  content: { width: '100%', alignSelf: 'center', gap: 24 },
  columns: { gap: 24 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  primaryColumn: { flex: 1.7, minWidth: 0, gap: 24 },
  secondaryColumn: { flex: 1, minWidth: 0, gap: 24 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMarkText: { color: colors.ink, fontSize: 23, fontWeight: '700' },
  brandWords: { gap: 1 },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  brandCaption: { color: colors.muted, fontSize: 12 },
  pageLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  summary: {
    backgroundColor: colors.raised,
    borderRadius: 16,
    gap: 12,
    padding: 24,
  },
  summaryMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  currencyTag: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currencyTagText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  total: { color: colors.ink, fontSize: 34, fontWeight: '700', lineHeight: 42, fontVariant: ['tabular-nums'] },
  totalCurrency: { color: colors.body, fontSize: 17, fontWeight: '600' },
  section: { gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  shortcutRow: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  shortcut: {
    alignItems: 'center',
    borderColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shortcutPressed: { opacity: 0.72 },
  shortcutIcon: {
    alignItems: 'center',
    backgroundColor: colors.raised,
    borderRadius: 9,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  shortcutGlyph: { color: colors.primary, fontSize: 19, fontWeight: '700' },
  shortcutLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  flow: { backgroundColor: colors.surface, borderRadius: 12, gap: 12, padding: 16 },
  flowWide: { flexDirection: 'row' },
  flowItem: {
    flexGrow: 1,
    minWidth: 0,
    gap: 8,
    paddingVertical: 4,
  },
  flowItemWide: { flexBasis: 140 },
  flowItemHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  flowSymbol: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  caption: { color: colors.body, flexShrink: 1, fontSize: 13, fontWeight: '600' },
  value: { color: colors.ink, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1 },
  warning: { color: colors.warning, fontSize: 14, lineHeight: 21 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  accountCount: {
    backgroundColor: colors.raised,
    borderRadius: 10,
    color: colors.body,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountList: { gap: 12, paddingRight: 20 },
  accountListWide: { gap: 12 },
  accountGroup: { width: 230, gap: 8 },
  accountGroupWide: { width: '100%' },
  bankName: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  account: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 10,
    padding: 16,
    width: 230,
  },
  accountWide: { width: '100%' },
  accountHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  accountName: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600' },
  accountCurrencyTag: {
    backgroundColor: colors.raised,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountCurrencyTagText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  error: { color: colors.error, fontSize: 16, textAlign: 'center' },
  reportsLink: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportsMark: {
    alignItems: 'center',
    backgroundColor: colors.raised,
    borderRadius: 9,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  reportsMarkText: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  reportsCopy: { flex: 1, gap: 3 },
  reportsTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  reportsHint: { color: colors.body, fontSize: 12 },
  reportsChevron: { color: colors.muted, fontSize: 24 },
});
