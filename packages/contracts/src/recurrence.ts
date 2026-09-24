import type { SupportedMonetaryUnitCode } from '@lukitas/domain';

export type RecurrenceCadenceDto = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export interface RecurringRuleDto {
  readonly id: string;
  readonly accountId: string;
  readonly categoryId?: string;
  readonly kind: 'INCOME' | 'EXPENSE';
  readonly amount: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly note?: string;
  readonly cadence: RecurrenceCadenceDto;
  readonly timezone: string;
  readonly startAt: string;
  readonly endAt?: string;
  readonly nextOccurrence: string;
  readonly active: boolean;
}
export interface CreateRecurringRuleRequest {
  readonly accountId: string;
  readonly categoryId?: string;
  readonly kind: 'INCOME' | 'EXPENSE';
  readonly amount: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly note?: string;
  readonly cadence: RecurrenceCadenceDto;
  readonly timezone: string;
  readonly startAt: string;
  readonly endAt?: string;
}
