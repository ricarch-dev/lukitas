import type { DashboardDto } from '@lukitas/contracts';

export type DashboardDisplayCurrency = keyof DashboardDto['comparison']['valuations'];
type DashboardValuation = DashboardDto['comparison']['valuations']['VES']['current'];

export const DISPLAY_CURRENCIES: readonly DashboardDisplayCurrency[] = ['VES', 'USD', 'EUR'];

export function defaultDisplayCurrency(baseCurrency: DashboardDto['baseCurrency']): DashboardDisplayCurrency {
  return baseCurrency === 'VES' || baseCurrency === 'EUR' ? baseCurrency : 'USD';
}

function dateEvidence(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat('es-VE', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

function quoteEvidence(valuation: DashboardValuation, period: string, target: DashboardDisplayCurrency): string[] {
  return valuation.quotes.map((quote) =>
    `${period}: ${quote.baseCurrency} a ${target}, cotización del ${dateEvidence(quote.effectiveAt)} (UTC), ` +
    `fuente ${quote.source === 'MANUAL' ? 'manual' : 'mercado'}.`,
  );
}

export function balanceSummary(
  dashboard: DashboardDto,
  currency: DashboardDisplayCurrency,
  showMonthlyComparison: boolean = true,
) {
  const { comparison } = dashboard;
  const selected = comparison.valuations[currency];
  const ves = comparison.valuations.VES.current;
  const hasCompleteMonthlyComparison = showMonthlyComparison &&
    !selected.current.partial && !selected.previous.partial;
  const warnings: string[] = [];
  const evidence = [
    ...quoteEvidence(selected.current, 'Actual', currency),
    ...(showMonthlyComparison ? quoteEvidence(selected.previous, 'Mes anterior', currency) : []),
    ...(currency !== 'VES' ? quoteEvidence(ves, 'Equivalente en bolívares', 'VES') : []),
  ];

  if (selected.current.partial) {
    warnings.push(`Saldo actual parcial: faltan cotizaciones para ${selected.current.missingCurrencies.join(', ')}.`);
  }
  if (showMonthlyComparison && selected.previous.partial) {
    warnings.push(`Comparación con el mes anterior no disponible: faltan cotizaciones para ${selected.previous.missingCurrencies.join(', ')}.`);
  }
  if (currency !== 'VES' && ves.partial) {
    warnings.push(`Equivalente en bolívares no disponible: faltan cotizaciones para ${ves.missingCurrencies.join(', ')} (subtotal parcial: ${ves.amount} VES).`);
  }
  if (hasCompleteMonthlyComparison && selected.percentChange === null) {
    warnings.push('No se puede calcular el cambio porcentual porque el saldo anterior es cero.');
  }

  return {
    amount: selected.current.amount,
    equivalent: currency === 'VES' || ves.partial ? null : ves.amount,
    percentChange: hasCompleteMonthlyComparison ? selected.percentChange : null,
    openingNote: showMonthlyComparison
      ? 'Los saldos iniciales se ubican en la fecha de creación de cada cuenta como aproximación.'
      : null,
    warnings,
    evidence,
  };
}
