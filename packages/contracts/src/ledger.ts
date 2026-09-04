export type TransactionKindDto = 'INCOME' | 'EXPENSE';
export interface TransactionDto { readonly id: string; readonly accountId: string; readonly kind: TransactionKindDto | 'OPENING'; readonly amount: string; readonly currencyCode: string; readonly occurredAt: string; readonly note?: string; readonly voidedAt?: string; }
export interface RecordTransactionRequest { readonly kind: TransactionKindDto; readonly amount: string; readonly currencyCode: string; readonly occurredAt?: string; readonly note?: string; }
export interface TransferRequest { readonly sourceAccountId: string; readonly destinationAccountId: string; readonly amount: string; readonly occurredAt?: string; readonly feeAmount?: string; readonly manualRate?: string; }
