import type { AccountDto, DashboardAccountCurrencyFilter } from '@lukitas/contracts';
import { addDecimal, decimalToString, parseDecimal, scaleUp } from '@lukitas/domain';

const currencyGroups = [
  { code: 'VES', label: 'Bolívares' },
  { code: 'USD', label: 'Dólares' },
] as const satisfies readonly { code: DashboardAccountCurrencyFilter; label: string }[];

export function currencyAccountBalances(accounts: readonly AccountDto[]) {
  return currencyGroups.flatMap(({ code, label }) => {
    const matching = accounts.filter(
      (account) => !account.archived && account.currency.code === code,
    );
    if (!matching.length) return [];
    const precision = matching[0].currency.precision;
    const total = matching.reduce(
      (sum, account) => addDecimal(sum, parseDecimal(account.balance)),
      parseDecimal('0'),
    );
    return [
      {
        code,
        label,
        amount: decimalToString(scaleUp(total, precision), precision),
        count: matching.length,
      },
    ];
  });
}
