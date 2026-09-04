// Public surface of the domain package.
// Zero I/O, zero external dependencies.

export { Currency } from './currency.ts';
export { Money } from './money.ts';
export { FxRate } from './fx-rate.ts';
export { FxSnapshot } from './fx-snapshot.ts';
export { createLedgerFact, signedEffect, balanceFor } from './ledger.ts';
export { selectHistoricalRate, requireHistoricalRate } from './fx-resolution.ts';
export type { LedgerFact, LedgerKind } from './ledger.ts';
export type { HistoricalRate } from './fx-resolution.ts';
export type {
  Decimal,
  DecimalInput,
  RoundingMode,
  ReciprocalRounding,
} from './decimal.ts';
export type { ResolveOptions, ConvertOptions } from './fx-snapshot.ts';
