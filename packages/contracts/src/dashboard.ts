import type { AccountDto } from './accounts.ts';
import type { TransactionDto } from './ledger.ts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';

export type DashboardDisplayCurrency = 'VES' | 'USD' | 'EUR';

export interface DashboardValuation {
  /** A subtotal when partial; never treat it as a complete portfolio value. */
  readonly amount: string;
  readonly partial: boolean;
  readonly missingCurrencies: readonly SupportedMonetaryUnitCode[];
  readonly quotes: readonly {
    readonly baseCurrency: SupportedMonetaryUnitCode;
    readonly effectiveAt: string;
    readonly source: 'MARKET' | 'MANUAL';
  }[];
}

export interface DashboardComparison {
  readonly currentCutoff: string;
  readonly previousCutoff: string;
  readonly openingBalanceDate: 'ACCOUNT_CREATED_AT_APPROXIMATION';
  /** VES is also the bolívar equivalent for either other display choice. */
  readonly valuations: Readonly<Record<DashboardDisplayCurrency, {
    readonly current: DashboardValuation;
    readonly previous: DashboardValuation;
    /** Null for partial valuations or zero previous balance. */
    readonly percentChange: string | null;
  }>>;
}

export interface DashboardDto {
  readonly baseCurrency: SupportedMonetaryUnitCode;
  readonly accounts: readonly AccountDto[];
  readonly totals: {
    readonly amount: string;
    readonly partial: boolean;
    readonly warnings: readonly string[];
  };
  readonly flow: {
    readonly income: string;
    readonly expense: string;
    readonly partial: boolean;
    readonly warnings: readonly string[];
  };
  readonly recentActivity: readonly TransactionDto[];
  readonly comparison: DashboardComparison;
}
