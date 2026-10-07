import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DashboardDto } from '@lukitas/contracts';
import { styles } from '../../../features/home-dashboard-styles';
import { balanceSummary, defaultDisplayCurrency, DISPLAY_CURRENCIES, type DashboardDisplayCurrency } from '../presentation/balance-summary';

export function BalanceSummary({ dashboard }: { dashboard: DashboardDto }) {
  // Local display preference only; never changes dashboard base currency or account data.
  const [choice, setChoice] = useState<DashboardDisplayCurrency>(() => defaultDisplayCurrency(dashboard.baseCurrency));
  const currency = choice;
  const summary = balanceSummary(dashboard, currency);

  return (
    <View style={styles.summary}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>Saldo total</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Moneda para mostrar el saldo" style={styles.currencySelector}>
        {DISPLAY_CURRENCIES.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={`Mostrar saldo en ${code}`}
            accessibilityState={{ selected: currency === code }}
            onPress={() => setChoice(code)}
            style={({ pressed }) => [styles.currencyOption, currency === code && styles.currencyOptionSelected, pressed && styles.shortcutPressed]}
          >
            <Text style={[styles.currencyOptionText, currency === code && styles.currencyOptionTextSelected]}>{code}</Text>
          </Pressable>
        ))}
      </View>
      <Text selectable accessibilityLiveRegion="polite" style={styles.total}>
        {summary.amount}{' '}<Text style={styles.totalCurrency}>{currency}</Text>
      </Text>
      {dashboard.comparison.valuations[currency].current.partial ? (
        <Text selectable style={styles.summaryNote}>Subtotal parcial, no representa el saldo total.</Text>
      ) : null}
      {summary.percentChange !== null ? (
        <Text selectable style={styles.comparisonChange}>
          {summary.percentChange.startsWith('-') ? '' : '+'}{summary.percentChange}% respecto al cierre del mes anterior
        </Text>
      ) : null}
      {summary.equivalent !== null ? (
        <Text selectable style={styles.equivalent}>Equivalente en bolívares: {summary.equivalent} VES</Text>
      ) : null}
      <Text selectable style={styles.summaryNote}>Corte del mes anterior (exclusivo): {dashboard.comparison.previousCutoff} (UTC). Valor actual: {dashboard.comparison.currentCutoff} (UTC).</Text>
      <Text selectable style={styles.summaryNote}>{summary.openingNote}</Text>
      {summary.evidence.length > 0 ? (
        <Text selectable style={styles.summaryNote}>
          {summary.evidence.join(' ')} Cotizaciones almacenadas; no son tasas en tiempo real.
        </Text>
      ) : null}
      {summary.warnings.map((warning) => <Text key={warning} selectable style={styles.warning}>{warning}</Text>)}
    </View>
  );
}
