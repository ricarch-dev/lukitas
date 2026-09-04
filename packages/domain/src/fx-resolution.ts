import { FxRate } from './fx-rate.ts';
import { Currency } from './currency.ts';

export interface HistoricalRate {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: string;
  readonly effectiveAt: string;
  readonly source: 'MARKET' | 'MANUAL';
}

export function selectHistoricalRate(
  rates: readonly HistoricalRate[],
  base: Currency,
  quote: Currency,
  occurredAt: string,
): HistoricalRate | undefined {
  const when = Date.parse(occurredAt);
  return rates
    .filter(
      (rate) =>
        rate.base.equals(base) && rate.quote.equals(quote) && Date.parse(rate.effectiveAt) <= when,
    )
    .sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt))[0];
}

export function requireHistoricalRate(
  rates: readonly HistoricalRate[],
  base: Currency,
  quote: Currency,
  occurredAt: string,
): FxRate {
  const selected = selectHistoricalRate(rates, base, quote, occurredAt);
  if (!selected)
    throw new RangeError(`Missing FX rate for ${base.code}/${quote.code} at ${occurredAt}`);
  return FxRate.of(selected.base, selected.quote, selected.rate);
}
