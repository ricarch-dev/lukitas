import type { DashboardDto } from '@lukitas/contracts';
import React, { useState } from 'react';
import { ActivityIndicator, Button, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../session/SessionContext';
import { PlanningScreen } from './planning-screens';
import { ReportsScreen } from './reports-screens';

export { AuthScreen } from './auth-screen';
export { OnboardingScreen } from './onboarding-screen';

type DashboardSection = 'dashboard' | 'planning' | 'reports';

const markerFor = (currency: string) => currency === 'USD' ? '🇺🇸' : currency === 'EUR' ? '🇪🇺' : '◉';
const formatAmount = (amount: string, currency: string) => `${currency === 'USD' ? '$' : `${currency} `}${amount}`;

function RoundAction({ icon, label }: { readonly icon: string; readonly label: string }) {
  return (
    <View style={styles.quickAction}>
      <View style={styles.roundIcon}>
        <Text style={styles.roundIconText}>{icon}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </View>
  );
}

function FlowCard({ icon, label, amount, color }: { readonly icon: string; readonly label: string; readonly amount: string; readonly color: string }) {
  return (
    <View style={styles.flowCard}>
      <View style={[styles.flowIcon, { backgroundColor: color }]}>
        <Text style={styles.flowIconText}>{icon}</Text>
      </View>
      <Text style={styles.flowLabel}>{label}</Text>
      <Text style={styles.flowAmount}>{amount}</Text>
    </View>
  );
}

function NavButton({ active, icon, label, onPress }: { readonly active: boolean; readonly icon: string; readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.navButton, active && styles.navButtonActive]}
    >
      <Text style={styles.navIcon}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function RialDashboard({ dashboard, onSelect, onSignOut }: { readonly dashboard: DashboardDto; readonly onSelect: (section: DashboardSection) => void; readonly onSignOut: () => void }) {
  const accounts = dashboard.accounts.filter((account) => !account.archived);
  const currencies = [dashboard.baseCurrency, ...accounts.map((account) => account.currency.code)].filter((currency, index, values) => values.indexOf(currency) === index).slice(0, 3);
  return <SafeAreaView style={styles.dashboardRoot}>
    <ScrollView contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}><View style={styles.topBar}><View style={styles.avatar}><Text style={styles.avatarText}>LK</Text></View><Text style={styles.wordmark}>◩ lukitas</Text><Pressable accessibilityLabel="Sign out" onPress={onSignOut} style={styles.helpButton}><Text style={styles.helpText}>↗</Text></Pressable></View><Text style={styles.balanceCaption}>My balance · {dashboard.baseCurrency}</Text><Text style={styles.total}>{formatAmount(dashboard.totals.amount, dashboard.baseCurrency)}</Text>{dashboard.totals.partial ? <Text style={styles.warning}>Some balances need exchange-rate evidence.</Text> : null}<View style={styles.currencyChips}>{currencies.map((currency) => <View key={currency} style={styles.currencyChip}><Text>{markerFor(currency)}</Text><Text style={styles.chipText}>{currency}</Text></View>)}</View></View>
      <View style={styles.quickActions}><RoundAction icon="⌗" label="Calculator" /><RoundAction icon="↕" label="Activity" /><RoundAction icon="▣" label="Accounts" /><RoundAction icon="⚙" label="Settings" /></View>
      <View style={styles.flowRow}><FlowCard icon="↑" label="Income" amount={dashboard.flow.income} color="#00b85b" /><FlowCard icon="↓" label="Expenses" amount={dashboard.flow.expense} color="#ff3e4d" /></View>
      {dashboard.flow.partial ? <Text style={styles.warning}>Some flow totals need exchange-rate evidence.</Text> : null}
      <Text style={styles.sectionTitle}>My balances</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>{accounts.map((account) => <View key={account.id} style={styles.accountCard}><Text style={styles.accountName}>{markerFor(account.currency.code)}  {account.name}</Text><Text style={styles.accountBalance}>{formatAmount(account.balance, account.currency.code)}</Text><View style={styles.accountFooter}><Text>Details</Text><Text>›</Text></View></View>)}{!accounts.length ? <Text style={styles.emptyAccounts}>No active accounts yet.</Text> : null}</ScrollView>
      {dashboard.totals.warnings.map((warning) => <Text key={warning} style={styles.warning}>{warning}</Text>)}
    </ScrollView>
    <View style={styles.bottomNav}><NavButton active icon="⌂" label="Home" onPress={() => onSelect('dashboard')} /><NavButton icon="◔" label="Planning" active={false} onPress={() => onSelect('planning')} /><NavButton icon="▦" label="Reports" active={false} onPress={() => onSelect('reports')} /></View>
  </SafeAreaView>;
}

export function DashboardScreen() {
  const { client, setTokens } = useSession();
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<DashboardSection>('dashboard');
  React.useEffect(() => { client.get<DashboardDto>('/dashboard').then(setDashboard).catch((value: unknown) => setError(value instanceof Error ? value.message : 'Unable to load dashboard')); }, [client]);
  if (error) return <SafeAreaView style={styles.root}><Text style={styles.error}>{error}</Text><Button title="Sign out" onPress={() => setTokens(null)} /></SafeAreaView>;
  if (!dashboard) return <SafeAreaView style={styles.root}><ActivityIndicator /></SafeAreaView>;
  if (section === 'planning') return <SafeAreaView style={styles.sectionRoot}><Button title="Back to overview" onPress={() => setSection('dashboard')} /><PlanningScreen /></SafeAreaView>;
  if (section === 'reports') return <SafeAreaView style={styles.sectionRoot}><Button title="Back to overview" onPress={() => setSection('dashboard')} /><ReportsScreen /></SafeAreaView>;
  return <RialDashboard dashboard={dashboard} onSelect={setSection} onSignOut={() => setTokens(null)} />;
}

const styles = StyleSheet.create({

  root: { flex: 1, gap: 14, padding: 24 },
  sectionRoot: { flex: 1 },
  error: { color: '#b42318' },
  dashboardRoot: { backgroundColor: '#f7f6fb', flex: 1 },
  dashboardContent: { paddingBottom: 112 },
  hero: { backgroundColor: '#e1f9a4', borderBottomLeftRadius: 34, borderBottomRightRadius: 34, padding: 22, paddingTop: 18 },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  avatar: { alignItems: 'center', backgroundColor: '#28331b', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  wordmark: { color: '#161616', fontSize: 25, fontWeight: '800' },
  helpButton: { alignItems: 'center', backgroundColor: '#fffdf5', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  helpText: { fontSize: 23, fontWeight: '700' },
  balanceCaption: { color: '#64705e', fontSize: 15, marginTop: 44, textAlign: 'center' },
  total: { color: '#121212', fontSize: 42, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  warning: { color: '#8d5b00', fontSize: 13, marginHorizontal: 22, marginTop: 8 },
  currencyChips: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 24 },
  currencyChip: { alignItems: 'center', backgroundColor: '#e8edcf', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: '#68705e', fontSize: 14, fontWeight: '600' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 18, paddingTop: 26 },
  quickAction: { alignItems: 'center', gap: 8, width: 72 },
  roundIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 32, height: 62, justifyContent: 'center', width: 62 },
  roundIconText: { fontSize: 26 },
  quickLabel: { color: '#252525', fontSize: 12, textAlign: 'center' },
  flowRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 22, paddingTop: 34 },
  flowCard: { backgroundColor: '#fff', borderRadius: 26, flex: 1, minHeight: 120, padding: 16 },
  flowIcon: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  flowIconText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  flowLabel: { color: '#252525', fontSize: 16, fontWeight: '700', marginTop: 9 },
  flowAmount: { color: '#161616', fontSize: 22, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#151515', fontSize: 28, fontWeight: '800', marginLeft: 22, marginTop: 34 },
  accountRow: { gap: 14, paddingHorizontal: 22, paddingTop: 16 },
  accountCard: { backgroundColor: '#fff', borderRadius: 28, minHeight: 176, padding: 18, width: 264 },
  accountName: { color: '#252525', fontSize: 18, fontWeight: '700' },
  accountBalance: { color: '#161616', fontSize: 28, fontWeight: '800', marginTop: 22 },
  accountFooter: { borderTopColor: '#ededed', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingTop: 14 },
  emptyAccounts: { color: '#68705e', paddingVertical: 24 },
  bottomNav: { backgroundColor: '#fff', borderColor: '#e6e4eb', borderRadius: 30, borderWidth: 1, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', left: 22, padding: 5, position: 'absolute', right: 22 },
  navButton: { alignItems: 'center', borderRadius: 24, flex: 1, gap: 2, paddingVertical: 8 },
  navButtonActive: { backgroundColor: '#edf0e5' },
  navIcon: { color: '#252525', fontSize: 25 },
  navLabel: { color: '#252525', fontSize: 12, fontWeight: '600' },
  navLabelActive: { color: '#486d14' },
});
