import { Currency } from './currency.ts';
import { Money } from './money.ts';
import { FxRate } from './fx-rate.ts';
import { getSupportedMonetaryUnit, type SupportedMonetaryUnitCode } from './monetary-unit.ts';
import { decimalToString, parseDecimal, subtractDecimal } from './decimal.ts';

export type DebtDirection = 'PAYABLE' | 'RECEIVABLE';
export type DebtStatus = 'PENDING' | 'OVERDUE' | 'SETTLED';
export type DebtEventKind = 'ORIGINATION' | 'PAYMENT';

export function debtOutstanding(principal: string, payments: readonly string[]): string {
  let remaining = parseDecimal(principal);
  for (const payment of payments) {
    const parsed = parseDecimal(payment);
    if (parsed.coefficient <= 0n) throw new RangeError('Payment must be positive');
    remaining = subtractDecimal(remaining, parsed);
  }
  if (remaining.coefficient < 0n) throw new RangeError('Payments exceed outstanding principal');
  return decimalToString(remaining, remaining.scale);
}

export function debtStatus(outstanding: string, dueDate: string | null, today: string): DebtStatus {
  if (parseDecimal(outstanding).coefficient === 0n) return 'SETTLED';
  return dueDate !== null && dueDate < today ? 'OVERDUE' : 'PENDING';
}

export function debtCashEffect(
  direction: DebtDirection,
  kind: DebtEventKind,
  amount: string,
): string {
  const outflow = (direction === 'RECEIVABLE') === (kind === 'ORIGINATION');
  return outflow ? `-${amount}` : amount;
}

/** Rate direction: 1 unit of account cash currency = rate units of debt currency. */
export function debtReduction(
  amount: string,
  cashCode: SupportedMonetaryUnitCode,
  debtCode: SupportedMonetaryUnitCode,
  rate?: string,
): string {
  const cashUnit = getSupportedMonetaryUnit(cashCode);
  const debtUnit = getSupportedMonetaryUnit(debtCode);
  const cash = Money.of(Currency.of(cashCode, cashUnit.precision), amount);
  if (parseDecimal(cash.amount).coefficient <= 0n) throw new RangeError('Payment must be positive');
  if (
    cashCode === debtCode &&
    rate !== undefined &&
    parseDecimal(rate).coefficient !== 10n ** BigInt(parseDecimal(rate).scale)
  )
    throw new RangeError('Rate must be one for the same currency');
  if (cashCode !== debtCode && rate === undefined)
    throw new RangeError('An explicit rate is required');
  const reduced =
    cashCode === debtCode
      ? cash.amount
      : FxRate.of(cash.currency, Currency.of(debtCode, debtUnit.precision), rate!).convert(
          cash,
          'HALF_UP',
        ).amount;
  if (parseDecimal(reduced).coefficient === 0n)
    throw new RangeError('Debt reduction rounds to zero');
  return reduced;
}
