import React from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AUTH_COLORS as colors } from './auth-screen-theme';
import { useDashboard } from './use-dashboard';
import { dashboardDisclosure } from './financial-disclosure';

export { AuthScreen } from './auth-screen';
export { OnboardingScreen } from './onboarding-screen';

export function DashboardScreen() {
  const { dashboard, error } = useDashboard();
  if (error) return <View style={styles.center}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>;
  if (!dashboard) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  const accounts = dashboard.accounts.filter(account => !account.archived);
  const disclosure = dashboardDisclosure(dashboard);
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
    <Text accessibilityRole="header" style={styles.title}>Inicio</Text>
    <View style={styles.summary}>
      <Text style={styles.caption}>Saldo en {dashboard.baseCurrency}</Text>
      <Text selectable style={styles.total}>{dashboard.totals.amount} {dashboard.baseCurrency}</Text>
      {disclosure.balance ? <Text style={styles.warning}>{disclosure.balance}</Text> : null}
    </View>
    <View style={styles.flow}>
      <View style={styles.flowItem}><Text style={styles.caption}>Ingresos del período</Text><Text selectable style={styles.value}>{dashboard.flow.income} {dashboard.baseCurrency}</Text></View>
      <View style={styles.flowItem}><Text style={styles.caption}>Gastos del período</Text><Text selectable style={styles.value}>{dashboard.flow.expense} {dashboard.baseCurrency}</Text></View>
    </View>
    {disclosure.flow ? <Text style={styles.warning}>{disclosure.flow}</Text> : null}
    {dashboard.totals.warnings.map((warning, index) => <Text key={`balance-${index}`} selectable style={styles.warning}>{warning}</Text>)}
    {dashboard.flow.warnings.map((warning, index) => <Text key={`flow-${index}`} selectable style={styles.warning}>{warning}</Text>)}
    <Text accessibilityRole="header" style={styles.heading}>Cuentas activas</Text>
    {accounts.length ? accounts.map(account => <View key={account.id} style={styles.account}>
      <Text style={styles.accountName}>{account.name}</Text>
      <Text selectable style={styles.value}>{account.balance} {account.currency.code}</Text>
    </View>) : <Text style={styles.caption}>Todavía no tienes cuentas activas.</Text>}
    <Link href="/informes" asChild><Pressable accessibilityRole="link" style={styles.link}><Text style={styles.linkText}>Ver informes del período</Text></Pressable></Link>
  </ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { flexGrow: 1, backgroundColor: colors.canvas, padding: 24, paddingBottom: 48, gap: 18 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700' },
  summary: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, gap: 8 },
  caption: { color: colors.body, fontSize: 15 },
  total: { color: colors.ink, fontSize: 32, fontWeight: '700' },
  flow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  flowItem: { flexGrow: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 },
  value: { color: colors.ink, fontSize: 19, fontWeight: '600' },
  heading: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  account: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, gap: 6 },
  accountName: { color: colors.body, fontSize: 16 },
  warning: { color: '#795200', fontSize: 14, lineHeight: 21 },
  error: { color: colors.error, fontSize: 16 },
  link: { paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
