import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Currency,
  SUPPORTED_MONETARY_UNITS,
  getSupportedMonetaryUnit,
  parseMonetaryUnitCode,
} from '../src/index.ts';

describe('monetary-unit codes', () => {
  it('accepts uppercase three- and four-character codes', () => {
    assert.strictEqual(parseMonetaryUnitCode('USD'), 'USD');
    assert.strictEqual(parseMonetaryUnitCode('USDT'), 'USDT');
    assert.strictEqual(Currency.of('USDT', 6).code, 'USDT');
  });

  it('rejects lowercase, malformed, short, and long codes', () => {
    for (const code of ['usdt', 'Usd', 'US', 'US-D', 'USDTX']) {
      assert.throws(() => parseMonetaryUnitCode(code), TypeError);
      assert.throws(() => Currency.of(code, 2), TypeError);
    }
  });

  it('rejects non-string runtime values without coercion', () => {
    for (const value of [undefined, null, 123, {}, ['USD']]) {
      assert.throws(() => parseMonetaryUnitCode(value), TypeError);
    }
  });
});

describe('supported monetary-unit metadata', () => {
  it('is the canonical active catalog with six-decimal USDT precision', () => {
    assert.deepStrictEqual(Object.keys(SUPPORTED_MONETARY_UNITS), [
      'USD',
      'EUR',
      'VES',
      'GBP',
      'USDT',
    ]);
    assert.deepStrictEqual(SUPPORTED_MONETARY_UNITS.USDT, {
      code: 'USDT',
      precision: 6,
      active: true,
    });
    assert.ok(Object.isFrozen(SUPPORTED_MONETARY_UNITS));
    assert.ok(Object.values(SUPPORTED_MONETARY_UNITS).every(Object.isFrozen));
  });

  it('resolves only supported monetary-unit metadata', () => {
    assert.strictEqual(getSupportedMonetaryUnit('USDT'), SUPPORTED_MONETARY_UNITS.USDT);
    assert.throws(() => getSupportedMonetaryUnit('BTC'), RangeError);
    assert.throws(() => getSupportedMonetaryUnit('ABCD'), RangeError);
    for (const value of [null, 123, ['USDT'], { code: 'USDT' }, 'usdt']) {
      assert.throws(() => getSupportedMonetaryUnit(value), TypeError);
    }
  });
});
