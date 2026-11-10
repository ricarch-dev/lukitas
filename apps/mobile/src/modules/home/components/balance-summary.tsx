import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DashboardDto } from '@lukitas/contracts';
import { styles } from '../styles/home-dashboard-styles';
import {
  balanceSummary,
  defaultDisplayCurrency,
  DISPLAY_CURRENCIES,
  type DashboardDisplayCurrency,
} from '../presentation/balance-summary';

type BalanceSummaryProps = {
  dashboard: DashboardDto;
  showMonthlyComparison?: boolean;
  compactDetails?: boolean;
};

function formatBalanceCutoff(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : `${new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)} UTC`;
}

export function BalanceSummary({
  dashboard,
  showMonthlyComparison = true,
  compactDetails = false,
}: BalanceSummaryProps) {
  // Local display preference only; never changes dashboard base currency or account data.
  const [choice, setChoice] = useState<DashboardDisplayCurrency>(() =>
    defaultDisplayCurrency(dashboard.baseCurrency),
  );
  const currency = choice;
  const summary = balanceSummary(dashboard, currency, showMonthlyComparison);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const evidenceDescription =
    summary.evidence.length > 0
      ? `${summary.evidence.join(' ')} Cotizaciones almacenadas; no son tasas en tiempo real. DolarApi (https://dolarapi.com) proporciona cotizaciones del BCV; otras tasas de mercado pueden tener fuentes distintas.`
      : null;

  return (
    <View style={[styles.summary, compactDetails && styles.summaryCompact]}>
      <Text accessibilityRole="header" style={styles.sectionLabel}>
        {compactDetails ? 'Mi balance' : 'Mi balance total'}
      </Text>
      <Text
        selectable
        accessibilityLiveRegion="polite"
        style={[styles.total, compactDetails && styles.totalCompact]}
      >
        {summary.amount} <Text style={styles.totalCurrency}>{currency}</Text>
      </Text>
      {dashboard.comparison.valuations[currency].current.partial ? (
        <Text selectable style={styles.summaryNote}>
          Subtotal parcial, no representa el saldo total.
        </Text>
      ) : null}
      {summary.percentChange !== null ? (
        <Text
          selectable
          style={[
            styles.comparisonChange,
            compactDetails && styles.comparisonCompact,
            compactDetails && summary.percentChange.startsWith('-') && styles.comparisonNegative,
            compactDetails && Number(summary.percentChange) === 0 && styles.comparisonNeutral,
          ]}
        >
          {compactDetails ? (
            <>
              {Number(summary.percentChange) === 0
                ? ''
                : summary.percentChange.startsWith('-')
                  ? '↓ '
                  : '↑ '}
              {summary.percentChange}% vs. mes pasado
            </>
          ) : (
            <>
              {summary.percentChange.startsWith('-') ? '' : '+'}
              {summary.percentChange}% respecto al cierre del mes anterior
            </>
          )}
        </Text>
      ) : null}
      {summary.equivalent !== null ? (
        <Text selectable style={[styles.equivalent, compactDetails && styles.equivalentCompact]}>
          {compactDetails
            ? `≈ Bs ${summary.equivalent}`
            : `Equivalente en bolívares: ${summary.equivalent} VES`}
        </Text>
      ) : null}
      {!compactDetails && showMonthlyComparison ? (
        <Text selectable style={styles.summaryNote}>
          Corte del mes anterior: {dashboard.comparison.previousCutoff} vs Valor actual:{' '}
          {dashboard.comparison.currentCutoff}
        </Text>
      ) : null}
      {!compactDetails && summary.openingNote !== null ? (
        <Text selectable style={styles.summaryNote}>
          {summary.openingNote}
        </Text>
      ) : null}
      {!compactDetails && evidenceDescription !== null ? (
        <Text selectable style={styles.summaryNote}>
          {evidenceDescription}
        </Text>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Moneda para mostrar el saldo"
        style={styles.currencySelector}
      >
        {DISPLAY_CURRENCIES.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityLabel={`Mostrar saldo en ${code}`}
            accessibilityState={{ selected: currency === code }}
            onPress={() => setChoice(code)}
            style={({ pressed }) => [
              styles.currencyOption,
              currency === code && styles.currencyOptionSelected,
              pressed && styles.shortcutPressed,
            ]}
          >
            <Text
              style={[
                styles.currencyOptionText,
                currency === code && styles.currencyOptionTextSelected,
              ]}
            >
              {code}
            </Text>
          </Pressable>
        ))}
      </View>
      {summary.warnings.map((warning) => (
        <Text key={warning} selectable style={styles.warning}>
          {warning}
        </Text>
      ))}
      {compactDetails ? (
        <View style={styles.balanceDetails}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              detailsOpen ? 'Ocultar detalles del balance' : 'Ver detalles del balance'
            }
            accessibilityState={{ expanded: detailsOpen }}
            onPress={() => setDetailsOpen((current) => !current)}
            style={styles.balanceDetailsButton}
          >
            <Text style={styles.balanceDetailsButtonText}>
              {detailsOpen ? 'Ocultar detalles' : 'Ver detalles del balance'}
            </Text>
          </Pressable>
          {detailsOpen ? (
            <View style={styles.balanceDetailsContent}>
              {showMonthlyComparison ? (
                <Text selectable style={styles.balanceDetailsText}>
                  Cierre del mes anterior:{' '}
                  {formatBalanceCutoff(dashboard.comparison.previousCutoff)}
                  {'\n'}Valor actual: {formatBalanceCutoff(dashboard.comparison.currentCutoff)}
                </Text>
              ) : null}
              {summary.openingNote !== null ? (
                <Text selectable style={styles.balanceDetailsText}>
                  {summary.openingNote}
                </Text>
              ) : null}
              {evidenceDescription !== null ? (
                <Text selectable style={styles.balanceDetailsText}>
                  {evidenceDescription}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
