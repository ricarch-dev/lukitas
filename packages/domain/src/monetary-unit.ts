const MONETARY_UNIT_CODE_PATTERN = /^[A-Z]{3,4}$/;

declare const monetaryUnitCodeBrand: unique symbol;

/** An uppercase three- or four-character monetary-unit code. */
export type MonetaryUnitCode = string & {
  readonly [monetaryUnitCodeBrand]: true;
};

export function parseMonetaryUnitCode(value: unknown): MonetaryUnitCode {
  if (typeof value !== 'string' || !MONETARY_UNIT_CODE_PATTERN.test(value)) {
    throw new TypeError(
      `Monetary unit code must contain three or four uppercase letters; got "${value}"`,
    );
  }

  return value as MonetaryUnitCode;
}

export const SUPPORTED_MONETARY_UNITS = {
  USD: { code: 'USD', precision: 2, active: true },
  EUR: { code: 'EUR', precision: 2, active: true },
  VES: { code: 'VES', precision: 2, active: true },
  GBP: { code: 'GBP', precision: 2, active: true },
  USDT: { code: 'USDT', precision: 6, active: true },
} as const;

export type SupportedMonetaryUnitCode = keyof typeof SUPPORTED_MONETARY_UNITS;

export interface MonetaryUnitMetadata {
  readonly code: SupportedMonetaryUnitCode;
  readonly precision: number;
  readonly active: boolean;
}

export function isSupportedMonetaryUnitCode(
  value: unknown,
): value is SupportedMonetaryUnitCode {
  return typeof value === 'string' && Object.hasOwn(SUPPORTED_MONETARY_UNITS, value);
}

export function getSupportedMonetaryUnit(value: unknown): MonetaryUnitMetadata {
  const code = parseMonetaryUnitCode(value);
  if (!isSupportedMonetaryUnitCode(value)) {
    throw new RangeError(`Unsupported monetary unit code: "${code}"`);
  }

  return SUPPORTED_MONETARY_UNITS[value];
}

Object.values(SUPPORTED_MONETARY_UNITS).forEach(Object.freeze);
Object.freeze(SUPPORTED_MONETARY_UNITS);
