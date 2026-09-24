/**
 * Tests for fx-rate.direction-inversion spec scenario.
 *
 * Covers:
 *  - Directional rate: 1 USD = 0.9 EUR
 *  - 10 USD → 9.00 EUR
 *  - 0 USD → 0.00 EUR (zero preserved)
 *  - -10 USD → -9.00 EUR (sign preserved)
 *  - Wrong-direction Money (EUR → USD when rate is USD→EUR) rejected
 *  - Same-currency rate rejected
 *  - Invalid rate (zero, negative, malformed, non-finite) rejected
 *  - Number rate rejected
 *  - Exact reciprocal: rate 2 → inverse 0.5
 *  - Non-terminating reciprocal (1/3) requires explicit precision/rounding
 *  - Non-terminating reciprocal (1/3) with precision 10 HALF_UP works
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Currency } from '../src/currency.ts';
import { Money } from '../src/money.ts';
import { FxRate } from '../src/fx-rate.ts';

const USD = Currency.of('USD', 2);
const EUR = Currency.of('EUR', 2);
const JPY = Currency.of('JPY', 0);
const USDT = Currency.of('USDT', 6);
const VES = Currency.of('VES', 2);

describe('fx-rate.direction-inversion', () => {
  it('converts USDT and fiat in the declared direction with target-only HALF_UP rounding', () => {
    const toUsd = FxRate.of(USDT, USD, '1.005');
    assert.strictEqual(toUsd.convert(Money.of(USDT, '1.234567'), 'HALF_UP').amount, '1.24');
    assert.strictEqual(
      FxRate.of(USDT, VES, '36.5').convert(Money.of(USDT, '1.234567'), 'HALF_UP').amount,
      '45.06',
    );
    const toUsdt = FxRate.of(USD, USDT, '1.2345675');
    assert.strictEqual(toUsdt.rate, '1.2345675');
    assert.strictEqual(toUsdt.convert(Money.of(USD, '1.00'), 'HALF_UP').amount, '1.234568');
    assert.strictEqual(toUsd.convert(Money.of(USDT, '1'), 'HALF_UP').amount, '1.01');
    assert.strictEqual(toUsd.convert(Money.of(USDT, '-1'), 'HALF_UP').amount, '-1.01');
    assert.strictEqual(toUsd.convert(Money.of(USDT, '0'), 'HALF_UP').amount, '0.00');
    assert.throws(() => toUsdt.convert(Money.of(USDT, '1'), 'HALF_UP'), /direction mismatch/);
  });
  it('1 USD = 0.9 EUR: 10 USD → 9.00 EUR', () => {
    const rate = FxRate.of(USD, EUR, '0.9');
    const ten = Money.of(USD, '10.00');
    const result = rate.convert(ten);
    assert.strictEqual(result.amount, '9.00');
    assert.strictEqual(result.currency.code, 'EUR');
  });

  it('1 USD = 0.9 EUR: 0 USD → 0.00 EUR (zero preserved)', () => {
    const rate = FxRate.of(USD, EUR, '0.9');
    const zero = Money.of(USD, '0.00');
    const result = rate.convert(zero);
    assert.strictEqual(result.amount, '0.00');
    assert.strictEqual(result.currency.code, 'EUR');
  });

  it('1 USD = 0.9 EUR: -10 USD → -9.00 EUR (sign preserved)', () => {
    const rate = FxRate.of(USD, EUR, '0.9');
    const neg = Money.of(USD, '-10.00');
    const result = rate.convert(neg);
    assert.strictEqual(result.amount, '-9.00');
    assert.strictEqual(result.currency.code, 'EUR');
  });

  it('wrong-direction Money is rejected', () => {
    const rate = FxRate.of(USD, EUR, '0.9');
    const eur = Money.of(EUR, '10.00');
    assert.throws(() => rate.convert(eur), RangeError);
  });

  it('rejects same-currency rate', () => {
    assert.throws(() => FxRate.of(USD, USD, '1'), RangeError);
  });

  it('rejects zero rate', () => {
    assert.throws(() => FxRate.of(USD, EUR, '0'), RangeError);
  });

  it('rejects negative rate', () => {
    assert.throws(() => FxRate.of(USD, EUR, '-1'), RangeError);
  });

  it('rejects malformed rate', () => {
    assert.throws(() => FxRate.of(USD, EUR, 'abc'), RangeError);
  });

  it('rejects non-finite rate string', () => {
    assert.throws(() => FxRate.of(USD, EUR, 'Infinity'), RangeError);
    assert.throws(() => FxRate.of(USD, EUR, 'NaN'), RangeError);
  });

  it('rejects exponent rate', () => {
    assert.throws(() => FxRate.of(USD, EUR, '1e2'), RangeError);
  });

  it('rejects Number rate', () => {
    // @ts-expect-error intentional runtime test
    assert.throws(() => FxRate.of(USD, EUR, 0.9), TypeError);
  });

  it('exact reciprocal: rate 2 → inverse 0.5', () => {
    const rate = FxRate.of(USD, EUR, '2');
    const inv = rate.invert();
    assert.strictEqual(inv.base.code, 'EUR');
    assert.strictEqual(inv.quote.code, 'USD');
    assert.strictEqual(inv.rate, '0.5');
  });

  it('non-terminating reciprocal (1/3) without precision/rounding throws', () => {
    const rate = FxRate.of(USD, EUR, '3');
    assert.throws(() => rate.invert(), RangeError);
  });

  it('non-terminating reciprocal (1/3) with explicit precision 10 HALF_UP succeeds', () => {
    const rate = FxRate.of(USD, EUR, '3');
    const inv = rate.invert({ precision: 10, mode: 'HALF_UP' });
    assert.strictEqual(inv.base.code, 'EUR');
    assert.strictEqual(inv.quote.code, 'USD');
    // 1/3 ≈ 0.3333333333
    assert.strictEqual(inv.rate, '0.3333333333');
  });

  it('FxRate is frozen (immutable)', () => {
    const rate = FxRate.of(USD, EUR, '0.9');
    assert.ok(Object.isFrozen(rate));
  });
});
