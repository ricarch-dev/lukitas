// DTO boundaries for the domain layer.
// These are plain read-only interfaces — no implementations, no I/O, no dependencies.

export type { CurrencyDto } from './money.ts';
export type { SupportedMonetaryUnitCode } from '@lukitas/domain';
export type { MoneyDto } from './money.ts';
export type { FxRateDto } from './fx.ts';
export type { FxSnapshotDto } from './fx.ts';
export type { AuthUserDto, AuthResponseDto, RegisterRequest, LoginRequest } from './auth.ts';
export type { OnboardingRequest, OnboardingResponse } from './onboarding.ts';
export type { AccountDto, CreateAccountRequest } from './accounts.ts';
export type {
  TransactionKindDto,
  TransactionDto,
  RecordTransactionRequest,
  TransferRequest,
} from './ledger.ts';
export type { DashboardDto } from './dashboard.ts';
export type { CategoryDto, CreateCategoryRequest, UpdateCategoryRequest } from './categories.ts';
export type { BudgetDto, UpsertBudgetRequest } from './budgets.ts';
export type {
  RecurrenceCadenceDto,
  RecurringRuleDto,
  CreateRecurringRuleRequest,
} from './recurrence.ts';
export type { FinancialReportDto, FinancialReportItem } from './reports.ts';
