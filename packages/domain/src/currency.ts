/**
 * Immutable Currency value object.
 *
 * Equality: uppercase three-letter code AND non-negative safe-integer precision.
 */

export interface CurrencyProps {
  readonly code: string;
  readonly precision: number;
}

export class Currency {
  readonly #code: string;
  readonly #precision: number;

  private constructor(code: string, precision: number) {
    this.#code = code;
    this.#precision = precision;
    Object.freeze(this);
  }

  static of(code: string, precision: number): Currency {
    if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) {
      throw new TypeError(`Currency code must be an uppercase three-letter string; got "${code}"`);
    }
    if (!Number.isInteger(precision) || precision < 0 || !Number.isSafeInteger(precision)) {
      throw new RangeError(
        `Currency precision must be a non-negative safe integer; got ${precision}`,
      );
    }
    return new Currency(code, precision);
  }

  get code(): string {
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
