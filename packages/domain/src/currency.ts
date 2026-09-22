/**
 * Immutable Currency value object.
 *
 * Equality: monetary-unit code AND non-negative safe-integer precision.
 */

import { parseMonetaryUnitCode, type MonetaryUnitCode } from './monetary-unit.ts';

export interface CurrencyProps {
  readonly code: MonetaryUnitCode;
  readonly precision: number;
}

export class Currency {
  readonly #code: MonetaryUnitCode;
  readonly #precision: number;

  private constructor(code: MonetaryUnitCode, precision: number) {
    this.#code = code;
    this.#precision = precision;
    Object.freeze(this);
  }

  static of(code: string, precision: number): Currency {
    const monetaryUnitCode = parseMonetaryUnitCode(code);
    if (!Number.isInteger(precision) || precision < 0 || !Number.isSafeInteger(precision)) {
      throw new RangeError(
        `Currency precision must be a non-negative safe integer; got ${precision}`,
      );
    }
    return new Currency(monetaryUnitCode, precision);
  }

  get code(): MonetaryUnitCode {
    return this.#code;
  }

  get precision(): number {
    return this.#precision;
  }

  /** Structural equality: same code and same precision. */
  equals(other: Currency): boolean {
    return this.#code === other.#code && this.#precision === other.#precision;
  }

  toString(): string {
    return `${this.#code}(${this.#precision})`;
  }
}
