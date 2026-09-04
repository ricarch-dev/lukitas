/**
 * Immutable Money value object.
 *
 * - Amount stored as a normalized Decimal (bigint coefficient, scale).
 * - Scale is always locked to currency.precision.
 * - Number is never accepted.
 * - Add/subtract/compare require equal Currency.
 * - Same-currency conversion returns the original Money unchanged.
 */

import { Currency } from './currency.ts';
import {
  type Decimal,
  type DecimalInput,
  type RoundingMode,
  addDecimal,
  compareDecimal,
  decimalToString,
  parseDecimal,
  scaleDown,
  scaleUp,
  subtractDecimal,
} from './decimal.ts';

export class Money {
  readonly #currency: Currency;
  readonly #value: Decimal; // always at scale === currency.precision

  private constructor(currency: Currency, value: Decimal) {
    this.#currency = currency;
    this.#value = value;
    Object.freeze(this);
  }

  /**
   * Constructs a Money.
   *
   * @param currency - target Currency (determines precision/scale)
   * @param amount   - string or bigint input; Number is rejected
   * @param roundingMode - required when amount has more fractional digits than
   *                       currency.precision; must be explicit
   */
  static of(currency: Currency, amount: DecimalInput, roundingMode?: RoundingMode): Money {
    if (typeof amount === 'number') {
      throw new TypeError('Number inputs are not accepted; use string or bigint');
    }

    const parsed = parseDecimal(amount);
    const targetScale = currency.precision;

    let value: Decimal;
    if (parsed.scale === targetScale) {
      value = parsed;
    } else if (parsed.scale < targetScale) {
      value = scaleUp(parsed, targetScale);
    } else {
      // parsed.scale > targetScale: rounding required
      if (!roundingMode) {
        throw new RangeError(
          `Amount "${amount}" has ${parsed.scale} decimal places but currency ` +
            `${currency.code} requires ${targetScale}; ` +
            `provide an explicit rounding mode`,
        );
      }
      value = scaleDown(parsed, targetScale, roundingMode);
    }

    return new Money(currency, value);
  }

  get currency(): Currency {
    return this.#currency;
  }

  /** Exact decimal string at currency.precision. */
  get amount(): string {
    return decimalToString(this.#value, this.#currency.precision);
  }

  /** Internal decimal value — package-level use only. */
  get _decimal(): Decimal {
    return this.#value;
  }

  /** Adds two Money values. Requires equal Currency. */
  add(other: Money): Money {
    this.#requireSameCurrency(other);
    const sum = addDecimal(this.#value, other.#value);
    return new Money(this.#currency, sum);
  }

  /** Subtracts another Money from this. Requires equal Currency. */
  subtract(other: Money): Money {
    this.#requireSameCurrency(other);
    const diff = subtractDecimal(this.#value, other.#value);
    return new Money(this.#currency, diff);
  }

  /**
   * Compares two Money values. Requires equal Currency.
   * Returns -1, 0, or 1.
   */
  compare(other: Money): -1 | 0 | 1 {
    this.#requireSameCurrency(other);
    return compareDecimal(this.#value, other.#value);
  }

  /**
   * Converts this Money to another Currency.
   * If base and quote are the same Currency, returns this unchanged.
   * Otherwise use FxRate.convert — this method is not for cross-currency conversion.
   */
  convertTo(target: Currency, roundingMode?: RoundingMode): Money {
    if (this.#currency.equals(target)) {
      return this;
    }
    throw new RangeError(
      `Cross-currency conversion via Money.convertTo is not supported; ` +
        `use FxRate.convert to convert from ${this.#currency.code} to ${target.code}`,
    );
  }

  /** Structural equality: same currency and same amount. */
  equals(other: Money): boolean {
    return (
      this.#currency.equals(other.#currency) && compareDecimal(this.#value, other.#value) === 0
    );
  }

  toString(): string {
    return `${this.amount} ${this.#currency.code}`;
  }

  #requireSameCurrency(other: Money): void {
    if (!this.#currency.equals(other.#currency)) {
      throw new RangeError(
        `Currency mismatch: cannot operate on ${this.#currency.code} and ${other.#currency.code}`,
      );
    }
  }
}
