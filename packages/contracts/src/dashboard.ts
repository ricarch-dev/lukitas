import type { AccountDto } from './accounts.ts';
import type { TransactionDto } from './ledger.ts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
export interface DashboardDto {
  readonly baseCurrency: SupportedMonetaryUnitCode;
  readonly accounts: readonly AccountDto[];
  readonly totals: {
    readonly amount: string;
    readonly partial: boolean;
    readonly warnings: readonly string[];
  };
  readonly flow: { readonly income: string; readonly expense: string };
  readonly recentActivity: readonly TransactionDto[];
}
