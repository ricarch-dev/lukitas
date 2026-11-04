import { addDecimal, decimalToString, parseDecimal } from '@lukitas/domain';
import type { TransactionDto } from '@lukitas/contracts';

export type Movement = TransactionDto;
export const movementAmount = (amount: string, currency: string): string =>
  `${currency === 'USD' ? '$ ' : ''}${amount} ${currency === 'USD' ? '' : currency}`.trim();
export interface MovementFilters {
  readonly search?: string;
  readonly kind?: 'INCOME' | 'EXPENSE';
  readonly categoryId?: string;
  readonly month?: string;
}

export function changeMonth(month: string, offset: number): string {
  const [year, part] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, part - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function movementDay(occurredAt: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(occurredAt));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function canExportMovements(
  loadedMonth: string,
  month: string,
  hasReport: boolean,
  loading: boolean,
  error: string,
): boolean {
  return loadedMonth === month && hasReport && !loading && !error;
}

export function calendarMonths(items: readonly Movement[], timezone: string): string[] {
  return [...new Set(items.map((item) => movementDay(item.occurredAt, timezone).slice(0, 7)))]
    .sort()
    .reverse();
}

export function filterMovements(items: readonly Movement[], filters: MovementFilters): Movement[] {
  const search = filters.search?.trim().toLocaleLowerCase() ?? '';
  return items
    .filter(
      (item) =>
        (!filters.month || item.occurredAt.slice(0, 7) === filters.month) &&
        (!filters.kind || item.kind === filters.kind) &&
        (!filters.categoryId || item.categoryId === filters.categoryId) &&
        (!search ||
          `${item.note ?? ''} ${item.amount} ${item.currencyCode} ${item.occurredAt} ${item.kind}`
            .toLocaleLowerCase()
            .includes(search)),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function monthlyFlow(items: readonly Movement[]) {
  const income: Record<string, string> = {};
  const expense: Record<string, string> = {};
  for (const item of items) {
    if (item.transferId || item.kind === 'OPENING') continue;
    const totals = item.kind === 'INCOME' ? income : expense;
    const sum = addDecimal(
      parseDecimal(totals[item.currencyCode] ?? '0'),
      parseDecimal(item.amount),
    );
    totals[item.currencyCode] = decimalToString(sum, Math.max(sum.scale, 2));
  }
  return { income, expense };
}

function csvField(value: string): string {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function movementsCsv(
  items: readonly Movement[],
  accounts: Readonly<Record<string, string>> = {},
  categories: Readonly<Record<string, string>> = {},
): string {
  // The report endpoint already applies the user's timezone-aware month bounds.
  const rows = items.map((item) => [
    item.occurredAt,
    item.transferId ? 'Transfer' : item.kind,
    accounts[item.accountId] ?? item.accountId,
    item.categoryId ? (categories[item.categoryId] ?? item.categoryId) : '',
    item.amount,
    item.currencyCode,
    item.note ?? '',
  ]);
  return `\uFEFF${[['Date', 'Type', 'Account', 'Category', 'Amount', 'Currency', 'Note'], ...rows]
    .map((row) => row.map(csvField).join(','))
    .join('\r\n')}\r\n`;
}
