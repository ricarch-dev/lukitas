import {
  debtCashEffect,
  debtReduction,
  type DebtDirection,
  type DebtEventKind,
} from '@lukitas/domain';
import type { Prisma } from '@prisma/client';
import { notFound, validation } from '../../common/errors.ts';
import { record, requiredString } from '../../common/request-input.ts';
import { code, nativeAmount, storedRate } from '../finance/amounts.ts';

export async function debtCash(
  tx: Prisma.TransactionClient,
  userId: string,
  raw: unknown,
  currencyCode: string,
) {
  const input = record(raw);
  const accountId = requiredString(input.accountId, 'Account is required');
  const account = await tx.account.findFirst({
    where: { id: accountId, userId, archivedAt: null },
  });
  if (!account) notFound('Active account not found');
  const cashCode = code(account.currencyCode);
  const amount = nativeAmount(input.amount, cashCode, 'positive');
  const rate = input.rate === undefined ? undefined : storedRate(input.rate);
  let debtAmount: string;
  try {
    debtAmount = debtReduction(amount, cashCode, code(currencyCode), rate);
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) validation(error.message);
    throw error;
  }
  // Domain conversion rounds once; persistence also enforces the existing storage limit.
  debtAmount = nativeAmount(debtAmount, code(currencyCode), 'positive');
  return {
    accountId,
    cashAmount: amount,
    cashCurrencyCode: cashCode,
    rate: rate ?? '1',
    debtAmount,
  };
}

export async function postDebtCash(
  tx: Prisma.TransactionClient,
  userId: string,
  direction: DebtDirection,
  kind: DebtEventKind,
  concept: string,
  occurredAt: Date,
  cash: Awaited<ReturnType<typeof debtCash>>,
) {
  // Principal is a ledger movement, never an ordinary income/expense transaction.
  const transaction = await tx.transaction.create({
    data: {
      userId,
      accountId: cash.accountId,
      kind: 'PRINCIPAL',
      amount: cash.cashAmount,
      currencyCode: cash.cashCurrencyCode,
      occurredAt,
      note: concept,
      entries: {
        create: {
          accountId: cash.accountId,
          signedAmount: debtCashEffect(direction, kind, cash.cashAmount),
        },
      },
    },
  });
  return transaction.id;
}
