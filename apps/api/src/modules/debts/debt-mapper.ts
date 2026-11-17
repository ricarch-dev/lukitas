import type { DebtDto, DebtSummaryDto } from '@lukitas/contracts';
import { debtOutstanding, debtStatus } from '@lukitas/domain';
import type { Prisma } from '@prisma/client';
import { addDecimal, code } from '../finance/amounts.ts';
import { debtDirection } from './debt-input.ts';

export const debtInclude = {
  events: { include: { account: true }, orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.DebtInclude;
export type DebtView = Prisma.DebtGetPayload<{ include: typeof debtInclude }>;

export function debtDto(debt: DebtView, today: string): DebtDto {
  const outstanding = debtOutstanding(
    debt.principal,
    debt.events.filter((event) => event.kind === 'PAYMENT').map((event) => event.debtAmount),
  );
  return {
    id: debt.id,
    direction: debtDirection(debt.direction),
    counterparty: debt.counterparty,
    concept: debt.concept,
    principal: debt.principal,
    outstanding,
    currencyCode: code(debt.currencyCode),
    occurredAt: debt.occurredAt.toISOString(),
    dueDate: debt.dueDate ?? undefined,
    status: debtStatus(outstanding, debt.dueDate, today),
    events: debt.events.map((event) => ({
      id: event.id,
      kind: event.kind === 'PAYMENT' ? 'PAYMENT' : 'ORIGINATION',
      debtAmount: event.debtAmount,
      occurredAt: event.occurredAt.toISOString(),
      accountId: event.accountId ?? undefined,
      accountName: event.account?.name,
      cashAmount: event.cashAmount ?? undefined,
      cashCurrencyCode: event.cashCurrencyCode ? code(event.cashCurrencyCode) : undefined,
      rate: event.rate ?? undefined,
    })),
  };
}

export function debtTotals(items: readonly DebtDto[]): DebtSummaryDto[] {
  const totals = new Map<string, DebtSummaryDto>();
  for (const item of items) {
    const previous = totals.get(item.currencyCode) ?? {
      currencyCode: item.currencyCode,
      payable: '0',
      receivable: '0',
    };
    totals.set(item.currencyCode, {
      ...previous,
      payable: addDecimal(previous.payable, item.direction === 'PAYABLE' ? item.outstanding : '0'),
      receivable: addDecimal(
        previous.receivable,
        item.direction === 'RECEIVABLE' ? item.outstanding : '0',
      ),
    });
  }
  return [...totals.values()].sort((left, right) =>
    left.currencyCode.localeCompare(right.currencyCode),
  );
}
