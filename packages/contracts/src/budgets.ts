export interface BudgetDto {
  readonly id: string;
  readonly categoryId: string;
  readonly month: string;
  readonly timezone: string;
  readonly currencyCode: string;
  readonly limit: string;
  readonly spent: string;
  readonly remaining: string;
  readonly partial: boolean;
  readonly warnings: readonly string[];
  readonly affectedIds: readonly string[];
}
export interface UpsertBudgetRequest {
  readonly categoryId: string;
  readonly month: string;
  readonly limit: string;
}
