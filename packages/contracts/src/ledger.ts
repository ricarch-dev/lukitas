import type { SupportedMonetaryUnitCode } from '@lukitas/domain';

export type TransactionKindDto = 'INCOME' | 'EXPENSE';
export interface TransactionDto {
  readonly id: string;
  readonly accountId: string;
  readonly kind: TransactionKindDto | 'OPENING';
  readonly amount: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly occurredAt: string;
  readonly note?: string;
  readonly voidedAt?: string;
  readonly categoryId?: string;
}
export interface RecordTransactionRequest {
  readonly kind: TransactionKindDto;
  readonly amount: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly occurredAt?: string;
  readonly note?: string;
  readonly categoryId?: string;
  readonly manualRate?: string;
}
export interface TransferRequest {
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: string;
  readonly occurredAt?: string;
  readonly feeAmount?: string;
  readonly manualRate?: string;
}
