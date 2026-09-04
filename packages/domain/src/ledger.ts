import { Currency } from './currency.ts';
import { Money } from './money.ts';

export type LedgerKind = 'OPENING' | 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface LedgerFact {
  readonly accountId: string;
  readonly kind: LedgerKind;
  readonly amount: Money;
  readonly occurredAt: string;
  readonly note?: string;
}

export function createLedgerFact(input: LedgerFact): LedgerFact {
  if (!input.accountId || !input.accountId.trim()) throw new RangeError('accountId is required');
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new RangeError('occurredAt must be a valid instant');
  if (input.amount._decimal.coefficient <= 0n) throw new RangeError('Ledger amounts must be positive');
  if (input.kind === 'OPENING' && input.amount.currency.precision < 0) throw new RangeError('Invalid currency');
  return Object.freeze({ ...input });
}

export function signedEffect(kind: LedgerKind, amount: Money): Money {
  if (kind === 'EXPENSE' || kind === 'TRANSFER_OUT') {
    return Money.of(amount.currency, `-${amount.amount}`);
  }
  return amount;
}

export function balanceFor(currency: Currency, openingBalance: Money, facts: readonly LedgerFact[]): Money {
  return facts.reduce((balance, fact) => balance.add(signedEffect(fact.kind, fact.amount)), openingBalance);
}
