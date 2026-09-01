import type { CurrencyDto, MoneyDto } from './money.ts';

/**
 * DTO shape for a directional FX rate: 1 BASE = rate QUOTE.
 * Transfer-only: no behaviour, no validation logic.
 */
export interface FxRateDto {
  readonly base: CurrencyDto;
  readonly quote: CurrencyDto;
  /** Exact decimal string of the positive rate value. */
  readonly rate: string;
}

/**
 * DTO shape for an FX snapshot entry.
 * Transfer-only: no behaviour, no validation logic.
 */
export interface FxSnapshotDto {
  /** ISO-8601 instant string. */
  readonly effectiveAt: string;
  readonly rates: readonly FxRateDto[];
  /** Source Money that anchors this snapshot (optional for traceability). */
  readonly source?: MoneyDto;
}
