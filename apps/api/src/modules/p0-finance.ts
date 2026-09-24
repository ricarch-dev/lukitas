import { validation } from '../common/errors.js';

export const currencyDefaults: Record<string, number> = {
  USD: 2,
  EUR: 2,
  VES: 2,
  GBP: 2,
  JPY: 0,
  BTC: 8,
};

export const asString = (value: unknown): string => String(value);

export const fixedAmount = (value: unknown, precision = 2): string => {
  const text = asString(value);
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole}${precision ? `.${fraction.padEnd(precision, '0').slice(0, precision)}` : ''}`;
};

export const now = () => new Date();

export const instant = (value: unknown): Date => {
  const date = value ? new Date(String(value)) : now();
  if (!Number.isFinite(date.getTime())) validation('occurredAt must be a valid ISO instant');
  return date;
};

export const positiveAmount = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'bigint')
    validation('Amount must be an exact decimal string');
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text) || /^0+(?:\.0+)?$/.test(text))
    validation('Amount must be positive');
  return text;
};

export const code = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value))
    validation('Currency must be an uppercase ISO-4217 code');
  return value;
};

const decimalParts = (value: string): [bigint, number] => {
  const [whole, fraction = ''] = value.split('.');
  return [BigInt(`${whole}${fraction}`), fraction.length];
};

export const addDecimal = (left: string, right: string): string => {
  const [a, as] = decimalParts(left);
  const [b, bs] = decimalParts(right);
  const scale = Math.max(as, bs);
  const factorA = 10n ** BigInt(scale - as);
  const factorB = 10n ** BigInt(scale - bs);
  const raw = a * factorA + b * factorB;
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

export const multiplyDecimal = (left: string, right: string, precision: number): string => {
  const [a, as] = decimalParts(left);
  const [b, bs] = decimalParts(right);
  const raw = a * b;
  const scale = as + bs;
  const divisor = 10n ** BigInt(Math.max(0, scale - precision));
  const rounded = divisor > 1n ? raw / divisor : raw * 10n ** BigInt(precision - scale);
  const negative = rounded < 0n;
  const abs = negative ? -rounded : rounded;
  const text = abs.toString().padStart(precision + 1, '0');
  return `${negative ? '-' : ''}${text.slice(0, -precision || undefined)}${precision ? `.${text.slice(-precision)}` : ''}`;
};

type TransactionView = {
  id: string;
  accountId: string;
  kind: string;
  amount: unknown;
  currencyCode: string;
  occurredAt: Date;
  note: string | null;
  voidedAt: Date | null;
  categoryId: string | null;
};

export const transactionDto = (value: TransactionView) => ({
  id: value.id,
  accountId: value.accountId,
  kind: value.kind,
  amount: fixedAmount(value.amount, currencyDefaults[value.currencyCode] ?? 2),
  currencyCode: value.currencyCode,
  occurredAt: value.occurredAt.toISOString(),
  note: value.note ?? undefined,
  voidedAt: value.voidedAt?.toISOString(),
  categoryId: value.categoryId ?? undefined,
});
