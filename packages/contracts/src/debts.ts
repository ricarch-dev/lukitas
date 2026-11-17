import type {
  SupportedMonetaryUnitCode,
  DebtDirection,
  DebtStatus,
  DebtEventKind,
} from '@lukitas/domain';

export interface DebtCashRequest {
  readonly accountId: string;
  readonly amount: string;
  /** Debt-currency units per one account-currency unit. Required for different currencies. */
  readonly rate?: string;
}

export interface CreateDebtRequest {
  readonly direction: DebtDirection;
  readonly counterparty: string;
  readonly concept: string;
  readonly principal: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly occurredAt: string;
  readonly dueDate?: string;
  /** Omit for a previously existing obligation, without a new account movement. */
  readonly cash?: DebtCashRequest;
}

export interface RecordDebtPaymentRequest extends DebtCashRequest {
  readonly occurredAt: string;
}

export interface DebtEventDto {
  readonly id: string;
  readonly kind: DebtEventKind;
  readonly occurredAt: string;
  readonly debtAmount: string;
  readonly accountId?: string;
  readonly accountName?: string;
  readonly cashAmount?: string;
  readonly cashCurrencyCode?: SupportedMonetaryUnitCode;
  readonly rate?: string;
}

export interface DebtDto {
  readonly id: string;
  readonly direction: DebtDirection;
  readonly counterparty: string;
  readonly concept: string;
  readonly principal: string;
  readonly outstanding: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly occurredAt: string;
  readonly dueDate?: string;
  readonly status: DebtStatus;
  readonly events: readonly DebtEventDto[];
}

export interface DebtSummaryDto {
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly payable: string;
  readonly receivable: string;
}

export interface DebtsOverviewDto {
  readonly items: readonly DebtDto[];
  readonly totals: readonly DebtSummaryDto[];
}
