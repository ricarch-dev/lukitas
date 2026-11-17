import {
  Currency,
  Money,
  debtOutstanding,
  debtReduction,
  getSupportedMonetaryUnit,
  type DebtDirection,
  type SupportedMonetaryUnitCode,
} from '@lukitas/domain';
import type {
  AccountDto,
  CreateDebtRequest,
  DebtDto,
  RecordDebtPaymentRequest,
} from '@lukitas/contracts';
import type { ApiClient } from '../../../api/client.ts';

export class DebtInputError extends Error {}

export type DebtForm = {
  direction: DebtDirection;
  counterparty: string;
  concept: string;
  principal: string;
  currencyCode: SupportedMonetaryUnitCode;
  date: string;
  dueDate: string;
  movesCash: boolean;
  accountId: string;
  cashAmount: string;
  rate: string;
};
export type PaymentForm = { accountId: string; amount: string; rate: string; date: string };

export function debtCalendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new DebtInputError('Ingresa una fecha con formato AAAA-MM-DD.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new DebtInputError('Ingresa una fecha válida.');
  return value;
}

function occurredAt(value: string): string {
  return new Date(`${debtCalendarDate(value)}T12:00:00`).toISOString();
}

function exactAmount(value: string, currencyCode: SupportedMonetaryUnitCode): string {
  try {
    const unit = getSupportedMonetaryUnit(currencyCode);
    const input = value.trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(input) || !/[1-9]/.test(input)) throw new RangeError();
    return Money.of(Currency.of(currencyCode, unit.precision), input).amount;
  } catch {
    throw new DebtInputError('Ingresa un monto mayor que cero con los decimales de la moneda.');
  }
}

export function cashPreview(
  accountId: string,
  amount: string,
  rateInput: string,
  debtCode: SupportedMonetaryUnitCode,
  accounts: readonly AccountDto[],
) {
  const account = accounts.find((item) => item.id === accountId && !item.archived);
  if (!account) throw new DebtInputError('Selecciona una cuenta activa.');
  const cashAmount = exactAmount(amount, account.currency.code);
  const rate = account.currency.code === debtCode ? undefined : rateInput.trim().replace(',', '.');
  if (rate !== undefined && (!/^\d+(?:\.\d+)?$/.test(rate) || !/[1-9]/.test(rate)))
    throw new DebtInputError('Ingresa una tasa de cambio mayor que cero.');
  let reduction: string;
  try {
    reduction = debtReduction(cashAmount, account.currency.code, debtCode, rate);
  } catch {
    throw new DebtInputError(
      'La conversión no puede reducir el saldo en cero. Revisa el monto y la tasa.',
    );
  }
  return { reduction, request: { accountId, amount: cashAmount, rate } };
}

export function buildDebtRequest(
  form: DebtForm,
  accounts: readonly AccountDto[],
): CreateDebtRequest {
  if (
    !form.counterparty.trim() ||
    !form.concept.trim() ||
    form.counterparty.trim().length > 200 ||
    form.concept.trim().length > 200
  )
    throw new DebtInputError(
      'Indica la persona o entidad y el concepto, con hasta 200 caracteres cada uno.',
    );
  const principal = exactAmount(form.principal, form.currencyCode);
  const date = debtCalendarDate(form.date);
  const dueDate = form.dueDate.trim() ? debtCalendarDate(form.dueDate.trim()) : undefined;
  if (dueDate && dueDate < date)
    throw new DebtInputError('El vencimiento no puede ser anterior a la fecha del registro.');
  const cash = form.movesCash
    ? cashPreview(form.accountId, form.cashAmount, form.rate, form.currencyCode, accounts)
    : undefined;
  if (cash && cash.reduction !== principal)
    throw new DebtInputError(
      'La conversión del dinero que se mueve debe coincidir con el principal.',
    );
  return {
    direction: form.direction,
    counterparty: form.counterparty.trim(),
    concept: form.concept.trim(),
    principal,
    currencyCode: form.currencyCode,
    occurredAt: occurredAt(date),
    dueDate,
    cash: cash?.request,
  };
}

export function buildDebtPayment(
  form: PaymentForm,
  debt: Pick<DebtDto, 'currencyCode' | 'outstanding' | 'occurredAt'>,
  accounts: readonly AccountDto[],
) {
  const cash = cashPreview(form.accountId, form.amount, form.rate, debt.currencyCode, accounts);
  const date = occurredAt(form.date);
  if (date < debt.occurredAt)
    throw new DebtInputError('El abono no puede ser anterior a la deuda.');
  try {
    debtOutstanding(debt.outstanding, [cash.reduction]);
  } catch {
    throw new DebtInputError('El abono supera el saldo pendiente.');
  }
  return { reduction: cash.reduction, request: { ...cash.request, occurredAt: date } };
}

export function submitDebt(
  client: Pick<ApiClient, 'post'>,
  request: CreateDebtRequest | RecordDebtPaymentRequest,
  key: string,
  id?: string,
) {
  return client.post<DebtDto>(
    id ? `/debts/${encodeURIComponent(id)}/payments` : '/debts',
    request,
    key,
  );
}
