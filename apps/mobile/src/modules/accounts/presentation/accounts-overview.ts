import type { DashboardAccountCurrencyFilter } from '@lukitas/contracts';

export type AccountsCurrencySelection = DashboardAccountCurrencyFilter | null;

export const ACCOUNT_CURRENCY_FILTERS = [
  { value: null, label: 'Todas', accessibilityLabel: 'Mostrar todas las cuentas' },
  { value: 'VES', label: 'Bolívares', accessibilityLabel: 'Mostrar cuentas en bolívares' },
  { value: 'USD', label: 'Dólares', accessibilityLabel: 'Mostrar cuentas en dólares' },
] as const satisfies readonly {
  readonly value: AccountsCurrencySelection;
  readonly label: string;
  readonly accessibilityLabel: string;
}[];
