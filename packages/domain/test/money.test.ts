/**
 * Tests for money.exact-immutable and money.validation-rounding spec scenarios.
 *
 * Covers:
 *  - 0.1 + 0.2 === 0.3 (exact)
 *  - Zero and negative values are valid
 *  - Same-currency identity: convertTo returns original Money
 *  - Mutation: Money is frozen / immutable
 *  - Currency validation: invalid code/precision
 *  - Amount validation: Number rejected, malformed rejected, exponent rejected
 *  - Precision mismatch without rounding mode: throws
 *  - Precision mismatch with HALF_UP: 1.005 → 1.01
 *  - Currency mismatch in arithmetic/compare: throws
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Currency } from '../src/currency.ts';
import { Money } from '../src/money.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USD = Currency.of('USD', 2);
const EUR = Currency.of('EUR', 2);
const USDT = Currency.of('USDT', 6);

// ---------------------------------------------------------------------------
// money.exact-immutable
// ---------------------------------------------------------------------------

describe('money.exact-immutable', () => {
  it('0.1 + 0.2 equals exactly 0.30', () => {
    const a = Money.of(USD, '0.1');
    const b = Money.of(USD, '0.2');
    const sum = a.add(b);
    assert.strictEqual(sum.amount, '0.30');
  });

  it('zero value is valid', () => {
    const zero = Money.of(USD, '0');
    assert.strictEqual(zero.amount, '0.00');
  });

  it('negative value is valid', () => {
    const neg = Money.of(USD, '-1');
    assert.strictEqual(neg.amount, '-1.00');
  });

  it('zero + negative preserves sign', () => {
    const zero = Money.of(USD, '0.00');
    const neg = Money.of(USD, '-5.00');
    assert.strictEqual(zero.add(neg).amount, '-5.00');
  });

  it('negative + positive sum to zero', () => {
    const pos = Money.of(USD, '3.50');
    const neg = Money.of(USD, '-3.50');
    assert.strictEqual(pos.add(neg).amount, '0.00');
  });

  it('same-currency convertTo returns original Money instance', () => {
    const m = Money.of(USD, '42.00');
    const result = m.convertTo(USD);
    assert.strictEqual(result, m, 'same-currency convertTo must return original Money');
  });

  it('Money is frozen (immutable)', () => {
    const m = Money.of(USD, '10.00');
    assert.ok(Object.isFrozen(m), 'Money must be frozen');
  });

  it('Currency is frozen (immutable)', () => {
    assert.ok(Object.isFrozen(USD), 'Currency must be frozen');
  });

  it('add result is a new Money, not mutated original', () => {
    const a = Money.of(USD, '1.00');
    const b = Money.of(USD, '2.00');
    const sum = a.add(b);
    assert.strictEqual(a.amount, '1.00', 'original a must be unchanged');
    assert.strictEqual(b.amount, '2.00', 'original b must be unchanged');
    assert.strictEqual(sum.amount, '3.00');
  });

  it('subtract result is a new Money, not mutated original', () => {
    const a = Money.of(USD, '5.00');
    const b = Money.of(USD, '3.00');
    const diff = a.subtract(b);
    assert.strictEqual(diff.amount, '2.00');
    assert.strictEqual(a.amount, '5.00');
  });

  it('compare returns 0 for equal amounts', () => {
    const a = Money.of(USD, '1.00');
    const b = Money.of(USD, '1.00');
    assert.strictEqual(a.compare(b), 0);
  });

  it('compare returns -1 for less-than', () => {
    const a = Money.of(USD, '0.50');
    const b = Money.of(USD, '1.00');
    assert.strictEqual(a.compare(b), -1);
  });

  it('compare returns 1 for greater-than', () => {
    const a = Money.of(USD, '2.00');
    const b = Money.of(USD, '1.00');
    assert.strictEqual(a.compare(b), 1);
  });
});

// ---------------------------------------------------------------------------
// money.validation-rounding
// ---------------------------------------------------------------------------

describe('money.validation-rounding', () => {
  it('rejects Number input', () => {
    assert.throws(
      // @ts-expect-error intentional runtime test
      () => Money.of(USD, 10),
      TypeError,
    );
  });

  it('rejects exponent notation', () => {
    assert.throws(() => Money.of(USD, '1e2'), RangeError);
  });

  it('rejects malformed string', () => {
    assert.throws(() => Money.of(USD, 'abc'), RangeError);
  });

  it('rejects non-finite string', () => {
    assert.throws(() => Money.of(USD, 'Infinity'), RangeError);
    assert.throws(() => Money.of(USD, 'NaN'), RangeError);
  });

  it('rejects empty string', () => {
    assert.throws(() => Money.of(USD, ''), RangeError);
  });

  it('rejects invalid Currency code (lowercase)', () => {
    assert.throws(() => Currency.of('usd', 2), TypeError);
  });

  it('rejects invalid Currency code (two letters)', () => {
    assert.throws(() => Currency.of('US', 2), TypeError);
  });

  it('rejects invalid Currency code (five letters)', () => {
    assert.throws(() => Currency.of('USDTX', 2), TypeError);
  });

  it('rejects negative precision', () => {
    assert.throws(() => Currency.of('USD', -1), RangeError);
  });

  it('rejects non-integer precision', () => {
    assert.throws(() => Currency.of('USD', 1.5), RangeError);
  });

  it('throws when scale exceeds precision and no rounding mode', () => {
    // 1.005 has 3 decimal places, USD has 2 — no mode provided
    assert.throws(
      () => Money.of(USD, '1.005'),
      RangeError,
      '1.005 without rounding mode must throw',
    );
  });

  it('HALF_UP rounds 1.005 to 1.01 at precision 2', () => {
    const m = Money.of(USD, '1.005', 'HALF_UP');
    assert.strictEqual(m.amount, '1.01');
  });

  it('HALF_UP rounds 1.004 to 1.00 at precision 2', () => {
    const m = Money.of(USD, '1.004', 'HALF_UP');
    assert.strictEqual(m.amount, '1.00');
  });

  it('HALF_UP rounds negative ties away from zero and retains exact USDT subunits', () => {
    assert.strictEqual(Money.of(USD, '-1.005', 'HALF_UP').amount, '-1.01');
    assert.strictEqual(Money.of(USDT, '0.000001').amount, '0.000001');
    assert.strictEqual(Money.of(USDT, '0').amount, '0.000000');
    assert.strictEqual(Money.of(USDT, '1.23456700', 'HALF_UP').amount, '1.234567');
  });

  it('throws on currency mismatch in add', () => {
    const usd = Money.of(USD, '1.00');
    const eur = Money.of(EUR, '1.00');
    assert.throws(() => usd.add(eur), RangeError);
  });

  it('throws on currency mismatch in subtract', () => {
    const usd = Money.of(USD, '1.00');
    const eur = Money.of(EUR, '1.00');
    assert.throws(() => usd.subtract(eur), RangeError);
  });

  it('throws on currency mismatch in compare', () => {
    const usd = Money.of(USD, '1.00');
    const eur = Money.of(EUR, '1.00');
    assert.throws(() => usd.compare(eur), RangeError);
  });

  it('cross-currency convertTo throws', () => {
    const usd = Money.of(USD, '1.00');
    assert.throws(() => usd.convertTo(EUR), RangeError);
  });
});
