import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApiClient } from '../src/api/client.ts';
import {
  buildDebtRequest,
  buildDebtPayment,
  submitDebt,
} from '../src/modules/debts/actions/debt-submit.ts';

const account = {
  id: 'usd',
  name: 'Dollars',
  archived: false,
  currency: { code: 'USD', precision: 2 },
};
const bolivars = {
  ...account,
  id: 'ves',
  name: 'Bolivars',
  currency: { code: 'VES', precision: 2 },
};
const form = {
  direction: 'RECEIVABLE',
  counterparty: ' Ana ',
  concept: ' Préstamo ',
  principal: '100,00',
  currencyCode: 'USD',
  date: '2026-11-01',
  dueDate: '',
  movesCash: false,
  accountId: '',
  cashAmount: '',
  rate: '',
};
const debt = {
  id: 'debt-1',
  currencyCode: 'USD',
  outstanding: '100.00',
  occurredAt: '2026-11-01T00:00:00Z',
};

test('old debt does not send a cash posting and new lending validates the account amount', () => {
  const old = buildDebtRequest(form, [account]);
  assert.equal(old.principal, '100.00');
  assert.equal(old.counterparty, 'Ana');
  assert.equal(old.cash, undefined);
  const current = buildDebtRequest(
    { ...form, movesCash: true, accountId: 'usd', cashAmount: '100' },
    [account],
  );
  assert.deepEqual(current.cash, { accountId: 'usd', amount: '100.00', rate: undefined });
  assert.throws(
    () =>
      buildDebtRequest({ ...form, movesCash: true, accountId: 'usd', cashAmount: '99' }, [account]),
    /principal/,
  );
  assert.throws(() => buildDebtRequest({ ...form, dueDate: '2026-02-30' }, [account]), /fecha/i);
});

test('multicurrency payment previews the same rounded principal reduction as the server', () => {
  const input = { accountId: 'ves', amount: '2000', rate: '0.025', date: '2026-11-05' };
  const result = buildDebtPayment(input, debt, [account, bolivars]);
  assert.equal(result.reduction, '50.00');
  assert.equal(result.request.amount, '2000.00');
  assert.equal(result.request.rate, '0.025');
  assert.throws(
    () => buildDebtPayment({ ...input, amount: '5000' }, debt, [bolivars]),
    /pendiente/,
  );
  assert.throws(() => buildDebtPayment({ ...input, rate: '' }, debt, [bolivars]), /tasa/i);
  assert.throws(
    () => buildDebtPayment({ ...input, amount: '0.01', rate: '0.001' }, debt, [bolivars]),
    /cero/,
  );
  assert.throws(
    () => buildDebtPayment({ ...input, accountId: 'unknown' }, debt, [bolivars]),
    /cuenta/i,
  );
});

test('debt submission uses the canonical authenticated client and caller-owned retry key', async (t) => {
  const calls = [];
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url, init) => {
    calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(init.body) });
    return Response.json({ id: 'debt-1', outstanding: '100.00' });
  };
  const client = new ApiClient({
    baseUrl: 'http://local.test/v1',
    getTokens: () => ({ accessToken: 'local-token', refreshToken: 'local-refresh' }),
  });
  const request = buildDebtRequest(form, []);
  await submitDebt(client, request, 'retry-key');
  await submitDebt(client, request, 'retry-key');
  await submitDebt(
    client,
    { accountId: 'usd', amount: '25.00', occurredAt: '2026-11-05T12:00:00Z' },
    'payment-key',
    'debt-1',
  );
  assert.equal(calls[0].headers.get('authorization'), 'Bearer local-token');
  assert.equal(calls[0].headers.get('idempotency-key'), calls[1].headers.get('idempotency-key'));
  assert.equal(calls[0].body.cash, undefined);
  assert.equal(calls[2].url, 'http://local.test/v1/debts/debt-1/payments');
  assert.equal(calls[2].headers.get('idempotency-key'), 'payment-key');
});

test('debt routes compose protected screens and home exposes separate obligations', () => {
  const src = join(import.meta.dirname, '..', 'src');
  for (const route of [
    'deudas/index.tsx',
    'deudas/crear.tsx',
    'deudas/[id].tsx',
    'deudas/[id]/abonar.tsx',
  ]) {
    const text = readFileSync(join(src, 'app', route), 'utf8');
    assert.match(text, /RootNavigator/);
  }
  const home = readFileSync(join(src, 'modules/home/screens/dashboard-screen.tsx'), 'utf8');
  const quick = readFileSync(join(src, 'modules/home/components/quick-actions-menu.tsx'), 'utf8');
  assert.match(home, /<DebtSummary/);
  assert.match(quick, /\/deudas\/crear/);
  const summary = readFileSync(join(src, 'modules/debts/components/debt-summary.tsx'), 'utf8');
  assert.match(summary, /Debes/);
  assert.match(summary, /Te deben/);
  assert.match(summary, /currencyCode/);
});
