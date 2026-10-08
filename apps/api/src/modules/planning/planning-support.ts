import type { Category, RecurringRule } from '@prisma/client';
import { validation } from '../../common/errors.js';

export const currencyDefaults: Record<string, number> = {
  USD: 2,
  EUR: 2,
  VES: 2,
  GBP: 2,
  JPY: 0,
  BTC: 8,
};

export const asString = (value: unknown): string => String(value);
export const now = () => new Date();

export const positiveAmount = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'bigint')
    validation('Amount must be an exact decimal string');
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text) || /^0+(?:\.0+)?$/.test(text))
    validation('Amount must be positive');
  return text;
};

export const instant = (value: unknown): Date => {
  const date = value ? new Date(String(value)) : now();
  if (!Number.isFinite(date.getTime())) validation('Date must be a valid ISO instant');
  return date;
};

export const safeTimezone = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) validation('Timezone is required');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    validation('Unsupported timezone');
  }
  return value;
};

export const normalizeName = (value: unknown): string => {
  if (typeof value !== 'string') validation('Name is required');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) validation('Name must contain 1-80 characters');
  return name;
};

export const normalizedName = (value: string) => value.toLocaleLowerCase();

export const code = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value))
    validation('Currency must be an uppercase ISO-4217 code');
  return value;
};

export const add = (left: string, right: string): string => {
  const parts = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return [BigInt(`${whole}${fraction}`), fraction.length] as const;
  };
  const [a, as] = parts(left);
  const [b, bs] = parts(right);
  const scale = Math.max(as, bs);
  const raw = a * 10n ** BigInt(scale - as) + b * 10n ** BigInt(scale - bs);
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const text = abs.toString().padStart(scale + 1, '0');
  return (
    `${negative ? '-' : ''}${text.slice(0, -scale || undefined)}${scale ? `.${text.slice(-scale).replace(/0+$/, '')}` : ''}`.replace(
      /\.$/,
      '',
    ) || '0'
  );
};

export const fixed = (value: unknown, precision = 2) => {
  const text = asString(value);
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole}${precision ? `.${fraction.padEnd(precision, '0').slice(0, precision)}` : ''}`;
};

export const dtoCategory = (category: Category) => ({
  id: category.id,
  name: category.name,
  archived: Boolean(category.archivedAt),
});

export const dtoRule = (rule: RecurringRule) => ({
  id: rule.id,
  accountId: rule.accountId,
  categoryId: rule.categoryId ?? undefined,
  kind: rule.kind,
  amount: fixed(rule.amount, currencyDefaults[rule.currencyCode] ?? 2),
  currencyCode: rule.currencyCode,
  note: rule.note ?? undefined,
  cadence: rule.cadence,
  timezone: rule.timezone,
  startAt: new Date(rule.startAt).toISOString(),
  endAt: rule.endAt ? new Date(rule.endAt).toISOString() : undefined,
  nextOccurrence: new Date(rule.nextOccurrence).toISOString(),
  active: rule.active,
});

export const addCadence = (value: Date, cadence: string) => {
  const next = new Date(value);
  if (cadence === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
};
