export interface FinancialReportItem {
  readonly id: string;
  readonly accountId: string;
  readonly categoryId?: string;
  readonly kind: 'INCOME' | 'EXPENSE' | 'OPENING';
  readonly amount: string;
  readonly currencyCode: string;
  readonly occurredAt: string;
}
export interface FinancialReportDto {
  readonly from: string;
  readonly to: string;
  readonly baseCurrency: string;
  readonly items: readonly FinancialReportItem[];
  readonly nativeTotals: Readonly<Record<string, string>>;
  readonly baseTotal?: string;
  readonly partial: boolean;
  readonly warnings: readonly string[];
  readonly affectedIds: readonly string[];
}
