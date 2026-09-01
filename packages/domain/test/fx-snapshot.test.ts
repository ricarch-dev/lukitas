/**
 * Tests for fx-snapshot.invariants spec scenario.
 *
 * Covers:
 *  - Invalid effectiveAt instant → throws
 *  - Direct rate lookup: succeeds
 *  - Reverse-only pair without invert option → throws
 *  - Reverse-only pair with { invert: true } → succeeds
 *  - Same-currency identity: convert returns original Money
 *  - Duplicate pair → throws at construction
 *  - Missing pair → throws at lookup
 *  - Chained pair (A→C not in snapshot, only A→B and B→C) → throws
 *  - Source mutation: mutating the rates array after snapshot creation has no effect
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Currency } from '../src/currency.ts';
import { Money } from '../src/money.ts';
import { FxRate } from '../src/fx-rate.ts';
import { FxSnapshot } from '../src/fx-snapshot.ts';

const USD = Currency.of('USD', 2);
const EUR = Currency.of('EUR', 2);
const GBP = Currency.of('GBP', 2);

const INSTANT = '2024-01-15T12:00:00.000Z';

describe('fx-snapshot.invariants', () => {
  it('rejects invalid effectiveAt (empty string)', () => {
    assert.throws(() => FxSnapshot.of('', []), TypeError);
  });

  it('rejects invalid effectiveAt (non-date string)', () => {
    assert.throws(() => FxSnapshot.of('not-a-date', []), RangeError);
  });

  it('rejects invalid effectiveAt (NaN date)', () => {
    // Some "date-like" strings that parse to NaN
    assert.throws(() => FxSnapshot.of('2024-99-99T00:00:00Z', []), RangeError);
  });

  it('effectiveAt is accessible and correct', () => {
    const snap = FxSnapshot.of(INSTANT, []);
    assert.strictEqual(snap.effectiveAt.toISOString(), INSTANT);
  });

  it('direct rate lookup succeeds', () => {
    const usdEur = FxRate.of(USD, EUR, '0.9');
    const snap = FxSnapshot.of(INSTANT, [usdEur]);
    const ten = Money.of(USD, '10.00');
    const result = snap.convert(ten, EUR);
    assert.strictEqual(result.amount, '9.00');
    assert.strictEqual(result.currency.code, 'EUR');
  });

  it('reverse-only pair without { invert: true } throws', () => {
    // Only EUR→USD is in snapshot; attempting USD→EUR without invert must throw
    const eurUsd = FxRate.of(EUR, USD, '1.1111');
    const snap = FxSnapshot.of(INSTANT, [eurUsd]);
    const ten = Money.of(USD, '10.00');
    assert.throws(() => snap.convert(ten, EUR), RangeError);
  });

  it('reverse-only pair with { invert: true } succeeds', () => {
    // EUR→USD rate is 2 (terminating reciprocal: USD→EUR = 0.5)
    const eurUsd = FxRate.of(EUR, USD, '2');
    const snap = FxSnapshot.of(INSTANT, [eurUsd]);
    const ten = Money.of(USD, '10.00');
    const result = snap.convert(ten, EUR, { invert: true });
    assert.strictEqual(result.amount, '5.00');
    assert.strictEqual(result.currency.code, 'EUR');
  });

  it('same-currency identity returns original Money', () => {
    const usdEur = FxRate.of(USD, EUR, '0.9');
    const snap = FxSnapshot.of(INSTANT, [usdEur]);
    const m = Money.of(USD, '42.00');
    const result = snap.convert(m, USD);
    assert.strictEqual(result, m, 'identity must return the original Money object');
  });

  it('duplicate pair at construction throws', () => {
    const r1 = FxRate.of(USD, EUR, '0.9');
    const r2 = FxRate.of(USD, EUR, '0.91');
    assert.throws(() => FxSnapshot.of(INSTANT, [r1, r2]), RangeError);
  });

  it('missing pair throws', () => {
    const snap = FxSnapshot.of(INSTANT, []);
    const ten = Money.of(USD, '10.00');
    assert.throws(() => snap.convert(ten, EUR), RangeError);
  });

  it('chain attempt throws (A→C when only A→B and B→C)', () => {
    const usdGbp = FxRate.of(USD, GBP, '0.8');
    const gbpEur = FxRate.of(GBP, EUR, '1.1');
    const snap = FxSnapshot.of(INSTANT, [usdGbp, gbpEur]);
    // USD→EUR is not in snapshot; chaining must not occur
    const ten = Money.of(USD, '10.00');
    assert.throws(() => snap.convert(ten, EUR), RangeError);
  });

  it('source mutation: mutating external rates array after construction does not affect snapshot', () => {
    const usdEur = FxRate.of(USD, EUR, '0.9');
    const mutableRates: FxRate[] = [usdEur];
    const snap = FxSnapshot.of(INSTANT, mutableRates);
    // Remove all rates from the external array
    mutableRates.splice(0, mutableRates.length);
    // Snapshot must still work
    const ten = Money.of(USD, '10.00');
    const result = snap.convert(ten, EUR);
    assert.strictEqual(result.amount, '9.00');
  });

  it('effectiveAt returns a defensive copy (external mutation does not affect snapshot)', () => {
    const snap = FxSnapshot.of(INSTANT, []);
    const d1 = snap.effectiveAt;
    d1.setFullYear(2000);
    const d2 = snap.effectiveAt;
    assert.strictEqual(d2.getFullYear(), 2024, 'effectiveAt must return a defensive copy');
  });

  it('FxSnapshot is frozen (immutable)', () => {
    const snap = FxSnapshot.of(INSTANT, []);
    assert.ok(Object.isFrozen(snap));
  });

  it('resolve with same currency throws (use identity instead)', () => {
    const snap = FxSnapshot.of(INSTANT, []);
    assert.throws(() => snap.resolve(USD, USD), RangeError);
  });
});
