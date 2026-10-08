import type { AccountDto, CreateAccountRequest } from '@lukitas/contracts';
import {
  Currency,
  Money,
  getSupportedMonetaryUnit,
  type SupportedMonetaryUnitCode,
} from '@lukitas/domain';
import type { ApiClient } from '../../../api/client.ts';

export class AccountInputError extends Error {}

export async function submitAccount(
  input: {
    name: string;
    balance: string;
    currencyCode: SupportedMonetaryUnitCode;
    bankName?: string;
    bankGroupId?: string;
  },
  post: ApiClient['post'],
  idempotencyKey: string,
): Promise<AccountDto> {
  const name = input.name.trim();
  if (!name) throw new AccountInputError('Escribe un nombre para la cuenta.');
  const balance = input.balance.trim().replace(',', '.');
  const unit = getSupportedMonetaryUnit(input.currencyCode);
  if (!/^\d+(?:\.\d+)?$/.test(balance))
    throw new AccountInputError('Ingresa un saldo inicial no negativo.');
  let openingBalance: string;
  try {
    openingBalance = Money.of(Currency.of(unit.code, unit.precision), balance).amount;
  } catch {
    throw new AccountInputError(
      `Ingresa un saldo válido con un máximo de ${unit.precision} decimales.`,
    );
  }
  const bankName = input.bankName?.trim();
  if (input.bankName !== undefined && !bankName)
    throw new AccountInputError('Escribe el nombre del banco.');
  const request: CreateAccountRequest = {
    name,
    currencyCode: unit.code,
    openingBalance,
    ...(bankName ? { bankName } : {}),
    ...(input.bankGroupId ? { bankGroupId: input.bankGroupId } : {}),
  };
  return post<AccountDto>('/accounts', request, idempotencyKey);
}
