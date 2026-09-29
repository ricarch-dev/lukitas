import React from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AUTH_COLORS as colors } from './auth-screen-theme';
import { useDashboard } from './use-dashboard';
import { dashboardDisclosure } from './financial-disclosure';

export { AuthScreen } from './auth-screen';
export { OnboardingScreen } from './onboarding-screen';

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
        <Text style={styles.loadingLabel}>Cargando tu resumen…</Text>
      </View>
    );
  const accounts = dashboard.accounts.filter((account) => !account.archived);
  const disclosure = dashboardDisclosure(dashboard);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
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
        {disclosure.balance ? <Text style={styles.warning}>{disclosure.balance}</Text> : null}
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Accesos rápidos
        </Text>
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
      </View>
      <View style={styles.flow}>
        <View style={styles.flowItem}>
          <View style={styles.flowItemHeading}>
            <Text accessible={false} style={styles.flowSymbol}>↑</Text>
            <Text style={styles.caption}>Ingresos del período</Text>
          </View>
          <Text selectable style={styles.value}>
            {dashboard.flow.income} {dashboard.baseCurrency}
          </Text>
        </View>
        <View style={styles.flowItem}>
          <View style={styles.flowItemHeading}>
            <Text accessible={false} style={styles.flowSymbol}>↓</Text>
            <Text style={styles.caption}>Gastos del período</Text>
          </View>
          <Text selectable style={styles.value}>
            {dashboard.flow.expense} {dashboard.baseCurrency}
          </Text>
        </View>
      </View>
      {disclosure.flow ? <Text style={styles.warning}>{disclosure.flow}</Text> : null}
      {dashboard.totals.warnings.map((warning, index) => (
        <Text key={`balance-${index}`} selectable style={styles.warning}>
          {warning}
        </Text>
      ))}
      {dashboard.flow.warnings.map((warning, index) => (
        <Text key={`flow-${index}`} selectable style={styles.warning}>
          {warning}
        </Text>
      ))}
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Cuentas activas</Text>
        <Text style={styles.accountCount}>{accounts.length}</Text>
      </View>
      {accounts.length ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountList}
          accessibilityLabel="Saldos de tus cuentas activas"
        >
          {accounts.map((account) => (
            <View key={account.id} style={styles.account}>
              <View style={styles.accountHeader}>
                <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
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
        </ScrollView>
      ) : (
        <Text style={styles.caption}>Todavía no tienes cuentas activas.</Text>
      )}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingLabel: { color: colors.body, fontSize: 14 },
  page: {
    flexGrow: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 44,
    gap: 22,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMarkText: { color: colors.surface, fontSize: 23, fontWeight: '700' },
  brandWords: { gap: 1 },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  brandCaption: { color: colors.muted, fontSize: 12 },
  pageLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  summaryMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  currencyTag: {
    backgroundColor: colors.segmentSurface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  currencyTagText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  total: { color: colors.ink, fontSize: 34, fontWeight: '700', lineHeight: 42 },
  totalCurrency: { color: colors.body, fontSize: 17, fontWeight: '600' },
  balanceCaption: { color: colors.muted, fontSize: 13 },
  section: { gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  shortcutRow: { flexDirection: 'row', gap: 10 },
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  shortcutPressed: { opacity: 0.72 },
  shortcutIcon: {
    alignItems: 'center',
    backgroundColor: colors.segmentSurface,
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  shortcutGlyph: { color: colors.primary, fontSize: 19, fontWeight: '700' },
  shortcutLabel: { color: colors.body, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  flow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  flowItem: {
    flexBasis: 140,
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  flowItemHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  flowSymbol: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  caption: { color: colors.body, flexShrink: 1, fontSize: 13, fontWeight: '600' },
  value: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  warning: { color: '#795200', fontSize: 14, lineHeight: 21 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  accountCount: {
    backgroundColor: colors.segmentSurface,
    borderRadius: 10,
    color: colors.body,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountList: { gap: 12, paddingRight: 20 },
  account: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    width: 230,
  },
  accountHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  accountName: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600' },
  accountCurrencyTag: {
    backgroundColor: colors.segmentSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountCurrencyTagText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  accountCurrency: { color: colors.body, fontSize: 13, fontWeight: '600' },
  error: { color: colors.error, fontSize: 16, textAlign: 'center' },
  reportsLink: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportsMark: {
    alignItems: 'center',
    backgroundColor: colors.segmentSurface,
    borderRadius: 12,
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
