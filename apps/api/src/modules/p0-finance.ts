import {
  Currency,
  FxRate,
  Money,
  addDecimal as addExact,
  decimalToString,
  getSupportedMonetaryUnit,
  multiplyExactDecimal,
  parseDecimal,
  scaleDown,
  scaleUp,
  type Decimal,
  type MonetaryUnitMetadata,
  type SupportedMonetaryUnitCode,
} from '@lukitas/domain';
import { Prisma } from '@prisma/client';
import { validation } from '../common/errors.js';

export type StoredDecimal = string | Prisma.Decimal;

export const decimalText = (value: StoredDecimal): string =>
  typeof value === 'string' ? value : value.toFixed();
export const asString = decimalText;

export const now = () => new Date();

export const instant = (value: unknown): Date => {
  const date = value ? new Date(String(value)) : now();
  if (!Number.isFinite(date.getTime())) validation('occurredAt must be a valid ISO instant');
  return date;
};

export const monetaryUnit = (value: unknown): MonetaryUnitMetadata => {
  try {
    const unit = getSupportedMonetaryUnit(value);
    if (!unit.active) validation('Currency must be an active monetary-unit code');
    return unit;
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError)
      validation('Currency must be a supported monetary-unit code');
    throw error;
  }
};

export const code = (value: unknown): SupportedMonetaryUnitCode => monetaryUnit(value).code;

export const currencyData = (value: unknown) => {
  const unit = monetaryUnit(value);
  return { code: unit.code, precision: unit.precision, active: unit.active };
};

const decimalInput = (value: unknown, kind: 'positive' | 'non-negative'): Decimal => {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))
    validation('Amount must be a non-negative exact decimal string');
  const parsed = parseDecimal(value);
  if (kind === 'positive' && parsed.coefficient === 0n) validation('Amount must be positive');
  return parsed;
};

// Decimal(20,8) and Decimal(24,12) each reserve twelve integral digits.
const withinColumn = (value: Decimal, fractionalDigits: number): void => {
  if (value.scale > fractionalDigits) {
    const divisor = 10n ** BigInt(value.scale - fractionalDigits);
    if (value.coefficient % divisor !== 0n)
      validation('Decimal has more fractional digits than the storage column');
  }
  const whole = value.coefficient / 10n ** BigInt(value.scale);
  if (whole >= 1_000_000_000_000n || whole <= -1_000_000_000_000n)
    validation('Decimal exceeds the storage column capacity');
};

export const storedAmount = (value: string): string => {
  const parsed = parseDecimal(value);
  withinColumn(parsed, 8);
  const scale = Math.min(parsed.scale, 8);
  return decimalToString(parsed.scale > scale
    ? { coefficient: parsed.coefficient / 10n ** BigInt(parsed.scale - scale), scale }
    : parsed, scale);
};

export const nativeAmount = (
  value: unknown,
  unitCode: SupportedMonetaryUnitCode,
  kind: 'positive' | 'non-negative',
): string => {
  const unit = monetaryUnit(unitCode);
  const parsed = decimalInput(value === undefined && kind === 'non-negative' ? '0' : value, kind);
  withinColumn(parsed, 8);
  if (parsed.scale > unit.precision && parsed.coefficient % 10n ** BigInt(parsed.scale - unit.precision) !== 0n)
    validation('Amount exceeds the monetary unit precision');
  const normalized = parsed.scale > unit.precision
    ? { coefficient: parsed.coefficient / 10n ** BigInt(parsed.scale - unit.precision), scale: unit.precision }
    : scaleUp(parsed, unit.precision);
  return Money.of(Currency.of(unit.code, unit.precision), decimalToString(normalized, unit.precision)).amount;
};

export const storedRate = (value: unknown): string => {
  const parsed = decimalInput(value, 'positive');
  withinColumn(parsed, 12);
  const scale = Math.min(parsed.scale, 12);
  const normalized = parsed.scale > scale
    ? { coefficient: parsed.coefficient / 10n ** BigInt(parsed.scale - scale), scale }
    : parsed;
  return decimalToString(normalized, scale);
};

// Legacy API callers are migrated to nativeAmount in the following work unit.
export const positiveAmount = (value: unknown): string => {
  if (typeof value !== 'string') validation('Amount must be an exact decimal string');
  decimalInput(value, 'positive');
  return value;
};

export const nonNegativeAmount = (value: unknown): string => {
  if (value === undefined) return '0';
  if (typeof value !== 'string') validation('Amount must be an exact decimal string');
  const parsed = decimalInput(value, 'non-negative');
  return parsed.coefficient === 0n ? '0' : value;
};

export const fixedAmount = (value: StoredDecimal, precision: number): string => {
  const parsed = parseDecimal(decimalText(value));
  const adjusted = parsed.scale > precision
    ? scaleDown(parsed, precision, 'HALF_UP')
    : scaleUp(parsed, precision);
  return decimalToString(adjusted, precision);
};

export const addDecimal = (left: string, right: string): string => {
  const sum = addExact(parseDecimal(left), parseDecimal(right));
  return decimalToString(sum, sum.scale);
};

export const convertAmount = (
  amount: string,
  source: SupportedMonetaryUnitCode,
  target: SupportedMonetaryUnitCode,
  rate: string,
): string => {
  const sourceUnit = monetaryUnit(source);
  const targetUnit = monetaryUnit(target);
  const sourceMoney = Money.of(Currency.of(source, sourceUnit.precision), amount, 'HALF_UP');
  const fx = FxRate.of(sourceMoney.currency, Currency.of(target, targetUnit.precision), storedRate(rate));
  const result = fx.convert(sourceMoney, 'HALF_UP').amount;
  storedAmount(result);
  return result;
};

// Compatibility for existing call sites; the source currency is required for new writes.
export const multiplyDecimal = (left: string, right: string, precision: number): string => {
  const product = multiplyExactDecimal(parseDecimal(left), parseDecimal(right));
  return fixedAmount(decimalToString(product, product.scale), precision);
};

type TransactionView = {
  id: string;
  accountId: string;
  kind: string;
  amount: StoredDecimal;
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
  amount: fixedAmount(value.amount, monetaryUnit(value.currencyCode).precision),
  currencyCode: code(value.currencyCode),
  occurredAt: value.occurredAt.toISOString(),
  note: value.note ?? undefined,
  voidedAt: value.voidedAt?.toISOString(),
  categoryId: value.categoryId ?? undefined,
});
