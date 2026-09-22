const MONETARY_UNIT_CODE_PATTERN = /^[A-Z]{3,4}$/;

declare const monetaryUnitCodeBrand: unique symbol;

/** An uppercase three- or four-character monetary-unit code. */
export type MonetaryUnitCode = string & {
  readonly [monetaryUnitCodeBrand]: true;
};

export function parseMonetaryUnitCode(value: string): MonetaryUnitCode {
  if (!MONETARY_UNIT_CODE_PATTERN.test(value)) {
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

Object.values(SUPPORTED_MONETARY_UNITS).forEach(Object.freeze);
Object.freeze(SUPPORTED_MONETARY_UNITS);
