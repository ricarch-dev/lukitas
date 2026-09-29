import type { DashboardDto, FinancialReportDto } from '@lukitas/contracts';

export function dashboardDisclosure(dashboard: DashboardDto) {
  return {
    balance: dashboard.totals.partial
      ? 'Saldo parcial: faltan tipos de cambio para algunas cuentas.'
      : null,
    flow: dashboard.flow.partial
      ? 'Los movimientos sin tipo de cambio no están incluidos en estos totales.'
      : null,
  };
}

export function reportDisclosure(report: FinancialReportDto) {
  return report.partial || report.baseTotal === undefined
    ? { warning: 'Total incompleto: faltan tipos de cambio para algunos movimientos.', total: null }
    : { warning: null, total: `Total neto: ${report.baseTotal} ${report.baseCurrency}` };
}
