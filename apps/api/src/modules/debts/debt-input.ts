import type { DebtDirection } from '@lukitas/domain';
import { validation } from '../../common/errors.ts';
import { requiredString } from '../../common/request-input.ts';

export function debtDirection(value: unknown): DebtDirection {
  if (value !== 'PAYABLE' && value !== 'RECEIVABLE') validation('Invalid debt direction');
  return value;
}

export function debtText(value: unknown, label: string): string {
  const text = requiredString(value, `${label} is required`);
  if (text.length > 200) validation(`${label} must not exceed 200 characters`);
  return text;
}

export function debtInstant(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))
    validation('A valid ISO date is required');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) validation('A valid ISO date is required');
  return date;
}

export function debtDueDate(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    validation('Due date must use YYYY-MM-DD');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    validation('Due date must be a valid calendar date');
  return value;
}

export function localDebtDate(clock: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(clock);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
