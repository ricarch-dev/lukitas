/**
 * Immutable FX snapshot: binds a valid effective instant to unique directional pairs.
 *
 * Rules:
 * - effectiveAt must be a valid non-empty ISO-8601 instant string.
 * - Pairs must be unique (no duplicate base/quote combinations).
 * - Direct rate lookup: returns rate if pair is present.
 * - Reverse lookup: requires explicit { invert: true }; throws otherwise.
 * - Same-currency identity: returns original Money unchanged.
 * - Missing pairs throw.
 * - Chains are forbidden (no implicit multi-hop).
 * - Source mutation: snapshot returns consistent results regardless of external
 *   mutations to the rates array passed at construction.
 */

import { Currency } from './currency.ts';
import { FxRate } from './fx-rate.ts';
import { Money } from './money.ts';
import type { RoundingMode, ReciprocalRounding } from './decimal.ts';

export interface ResolveOptions {
  readonly invert?: boolean;
  readonly reciprocalRounding?: ReciprocalRounding;
}

export interface ConvertOptions {
  readonly invert?: boolean;
  readonly roundingMode?: RoundingMode;
  readonly reciprocalRounding?: ReciprocalRounding;
}

export class FxSnapshot {
  readonly #effectiveAt: Date;
  /** Stored as a defensive copy, keyed by "BASE/QUOTE". */
  readonly #rates: ReadonlyMap<string, FxRate>;

  private constructor(effectiveAt: Date, rates: ReadonlyMap<string, FxRate>) {
    this.#effectiveAt = effectiveAt;
    this.#rates = rates;
    Object.freeze(this);
  }

  /**
   * Creates a snapshot.
   *
   * @param effectiveAt - valid ISO-8601 instant string (e.g. "2024-01-15T12:00:00Z")
   * @param rates       - directional FxRate array; pairs must be unique
   */
  static of(effectiveAt: string, rates: readonly FxRate[]): FxSnapshot {
    if (!effectiveAt || typeof effectiveAt !== 'string') {
      throw new TypeError('effectiveAt must be a non-empty string');
    }

    // Validate that the string parses to a real date
    const ts = Date.parse(effectiveAt);
    if (!Number.isFinite(ts)) {
      throw new RangeError(`effectiveAt is not a valid ISO-8601 instant: "${effectiveAt}"`);
    }

    const map = new Map<string, FxRate>();
    for (const rate of rates) {
      const key = FxSnapshot.#pairKey(rate.base, rate.quote);
      if (map.has(key)) {
        throw new RangeError(
          `Duplicate rate pair ${rate.base.code}/${rate.quote.code} in snapshot`
        );
      }
      map.set(key, rate);
    }

    return new FxSnapshot(new Date(ts), map);
  }

  get effectiveAt(): Date {
    return new Date(this.#effectiveAt.getTime());
  }

  /**
   * Resolves the FxRate for a base/quote pair.
   *
   * - Direct: pair must be present.
   * - Reverse: requires options.invert = true; returns the rate's inverse.
   * - Same currency: throws (use Money.convertTo for identity).
   * - Missing: throws.
   * - Chain (neither direct nor reverse): throws.
   */
  resolve(base: Currency, quote: Currency, options: ResolveOptions = {}): FxRate {
    if (base.equals(quote)) {
      throw new RangeError(
        `FxSnapshot.resolve requires distinct currencies; use Money.convertTo for same-currency identity`
      );
    }

    const directKey = FxSnapshot.#pairKey(base, quote);
    if (this.#rates.has(directKey)) {
      const rate = this.#rates.get(directKey)!;
      if (options.invert) {
        return rate.invert(options.reciprocalRounding);
      }
      return rate;
    }

    // Check reverse
    const reverseKey = FxSnapshot.#pairKey(quote, base);
    if (this.#rates.has(reverseKey)) {
      if (!options.invert) {
        throw new RangeError(
          `Rate ${base.code}/${quote.code} is not in the snapshot; ` +
            `only ${quote.code}/${base.code} is present. ` +
            `Pass { invert: true } to use the inverse.`
        );
      }
      const reverseRate = this.#rates.get(reverseKey)!;
      return reverseRate.invert(options.reciprocalRounding);
    }

    throw new RangeError(
      `Rate pair ${base.code}/${quote.code} (and its inverse) is not in this snapshot`
    );
  }

  /**
   * Converts Money to a target Currency using this snapshot.
   *
   * - Same currency: returns original Money unchanged (identity).
   * - Direct rate: converts directly.
   * - Reverse-only pair: requires options.invert = true.
   * - Missing pair: throws.
   * - Chains: throws (no implicit intermediate currency).
   */
  convert(money: Money, quote: Currency, options: ConvertOptions = {}): Money {
    if (money.currency.equals(quote)) {
      return money;
    }

    const rate = this.resolve(money.currency, quote, {
      invert: options.invert,
      reciprocalRounding: options.reciprocalRounding,
    });

    return rate.convert(money, options.roundingMode);
  }

  static #pairKey(base: Currency, quote: Currency): string {
    return `${base.code}/${quote.code}`;
  }
}
