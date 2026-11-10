import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const { BcvRateSync, p0Providers } = await import('../src/modules/p0.module.ts');

test('registers the BCV rate sync dependency required by the dashboard', () => {
  assert.ok(p0Providers.includes(BcvRateSync));
});
