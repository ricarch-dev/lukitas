/**
 * Immutable directional FX rate: 1 BASE = rate QUOTE.
 *
 * - Positive exact value only.
 * - Accepts only base Money, multiplies into quote Money.
 * - Preserves zero and sign.
 * - Wrong-direction Money is rejected.
 * - Inversion: terminating reciprocals are exact; non-terminating require
 *   explicit precision/rounding.
 */

import { Currency } from './currency.ts';
import { Money } from './money.ts';
import {
  type Decimal,
  type DecimalInput,
  type RoundingMode,
  type ReciprocalRounding,
  decimalToString,
  isPositiveDecimal,
  multiplyDecimal,
  parseDecimal,
  reciprocal,
  scaleDown,
  scaleUp,
} from './decimal.ts';

export class FxRate {
  readonly #base: Currency;
  readonly #quote: Currency;
  readonly #rate: Decimal; // always positive

  private constructor(base: Currency, quote: Currency, rate: Decimal) {
    this.#base = base;
    this.#quote = quote;
    this.#rate = rate;
    Object.freeze(this);
  }

  /**
   * Creates a directional FxRate: 1 BASE = rate QUOTE.
   *
   * @param base  - base Currency (what you give)
   * @param quote - quote Currency (what you get)
   * @param rate  - positive rate value; string or bigint; Number is rejected
   */
  static of(
    base: Currency,
    quote: Currency,
    rate: DecimalInput
  ): FxRate {
    if (typeof rate === 'number') {
      throw new TypeError('Number inputs are not accepted; use string or bigint');
    }
    if (base.equals(quote)) {
      throw new RangeError(
        `FxRate base and quote must be distinct currencies; both are ${base.code}`
      );
    }

    const parsed = parseDecimal(rate);

    if (!isPositiveDecimal(parsed)) {
      throw new RangeError(`FxRate rate must be positive; got "${rate}"`);
    }

    return new FxRate(base, quote, parsed);
  }

  get base(): Currency {
    return this.#base;
  }

  get quote(): Currency {
    return this.#quote;
  }

  get rate(): string {
    return decimalToString(this.#rate, this.#rate.scale);
  }

  /** Internal rate decimal — package-level use only. */
  get _rateDecimal(): Decimal {
    return this.#rate;
  }

  /**
   * Converts a base Money to quote Money.
   *
   * - Accepts ONLY Money whose currency equals this rate's base.
   * - Preserves zero and sign.
   * - Result is quantized to quote.precision using explicit roundingMode when
   *   the product has excess scale; if no rounding is provided and the product
   *   has excess scale, throws.
   */
  convert(money: Money, roundingMode?: RoundingMode): Money {
    if (!money.currency.equals(this.#base)) {
      throw new RangeError(
        `FxRate direction mismatch: rate converts ${this.#base.code} → ${this.#quote.code} ` +
          `but received ${money.currency.code} Money; ` +
          `invert the rate first if you need the reverse direction`
      );
    }

    const product = multiplyDecimal(money._decimal, this.#rate);
    const targetScale = this.#quote.precision;

    let quantized: Decimal;
    if (product.scale === targetScale) {
      quantized = product;
    } else if (product.scale < targetScale) {
      quantized = scaleUp(product, targetScale);
    } else {
      // product.scale > targetScale: check if reduction is exact (trailing zeros only)
      const steps = product.scale - targetScale;
      const divisor = 10n ** BigInt(steps);
      const absCoeff = product.coefficient < 0n ? -product.coefficient : product.coefficient;
      const remainder = absCoeff % divisor;
      if (remainder === 0n) {
        // Exact reduction — no rounding information lost
        quantized = { coefficient: product.coefficient / divisor, scale: targetScale };
      } else {
        if (!roundingMode) {
          throw new RangeError(
            `Conversion product has ${product.scale} decimal places but ` +
              `${this.#quote.code} requires ${targetScale}; provide an explicit rounding mode`
          );
        }
        quantized = scaleDown(product, targetScale, roundingMode);
      }
    }

    return Money.of(this.#quote, decimalToString(quantized, targetScale));
  }

  /**
   * Returns the inverse rate: 1 QUOTE = (1/rate) BASE.
   *
   * Terminating reciprocals are computed exactly; passing reciprocalRounding
   * for a terminating reciprocal is accepted and applied.
   *
   * Non-terminating reciprocals require explicit reciprocalRounding; throws
   * without it.
   */
  invert(reciprocalRounding?: ReciprocalRounding): FxRate {
    const inv = reciprocal(this.#rate, reciprocalRounding);
    return new FxRate(this.#quote, this.#base, inv);
  }

  toString(): string {
    return `1 ${this.#base.code} = ${this.rate} ${this.#quote.code}`;
  }
}
