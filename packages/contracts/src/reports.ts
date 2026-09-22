import type { SupportedMonetaryUnitCode } from '@lukitas/domain';

export interface FinancialReportItem {
  readonly id: string;
  readonly accountId: string;
  readonly categoryId?: string;
  readonly kind: 'INCOME' | 'EXPENSE' | 'OPENING';
  readonly amount: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly occurredAt: string;
}
export interface FinancialReportDto {
  readonly from: string;
  readonly to: string;
  readonly baseCurrency: SupportedMonetaryUnitCode;
  readonly items: readonly FinancialReportItem[];
  readonly nativeTotals: Readonly<Partial<Record<SupportedMonetaryUnitCode, string>>>;
  readonly baseTotal?: string;
  readonly partial: boolean;
  readonly warnings: readonly string[];
  readonly affectedIds: readonly string[];
}
