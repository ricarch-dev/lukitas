import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';
const { DashboardController } = await import('../src/modules/p0-monetary.ts');
const { dashboardHarness } = await import('./fixtures/monetary-harness.mjs');

const date = (value) => new Date(value);
const clock = date('2026-10-12T12:00:00Z');
const from = '2026-10-01T00:00:00Z';
const to = clock.toISOString();
const account = (id, currencyCode, openingBalance) => ({
  id,
  userId: 'owner',
  currencyCode,
  openingBalance,
  createdAt: date('2026-08-01T00:00:00Z'),
  archivedAt: null,
  currency: { code: currencyCode, precision: currencyCode === 'USDT' ? 6 : 2 },
  bankGroup: null,
});
const posting = (state, id, accountId, signedAmount, currencyCode) => {
  state.transactions.push({
    id,
    accountId,
    userId: 'owner',
    kind: signedAmount.startsWith('-') ? 'EXPENSE' : 'INCOME',
    amount: signedAmount.replace('-', ''),
    currencyCode,
    occurredAt: date('2026-10-05T12:00:00Z'),
    voidedAt: null,
    transferId: null,
    fxSnapshot: null,
    note: null,
    categoryId: null,
  });
  state.ledger.push({ transactionId: id, accountId, signedAmount });
};
const rate = (state, baseCode, quoteCode, value) => state.rates.push({
  baseCode,
  quoteCode,
  rate: value,
  effectiveAt: date('2026-09-20T00:00:00Z'),
  source: 'MARKET',
});
const getDashboard = (harness, accountCurrency) => harness.dashboard.get(
  'owner', from, to, clock, accountCurrency,
);

test('currency filters scope active accounts, period data and all dashboard valuations', async () => {
  const harness = dashboardHarness('USD');
  const { state } = harness;
  state.accounts.push(
    account('ves', 'VES', '10'),
    account('usd', 'USD', '5'),
    account('eur', 'EUR', '7'),
    account('usdt', 'USDT', '2.000000'),
  );
  posting(state, 'ves-income', 'ves', '2', 'VES');
  posting(state, 'usd-expense', 'usd', '-1', 'USD');
  posting(state, 'eur-income', 'eur', '3', 'EUR');
  posting(state, 'usdt-income', 'usdt', '1', 'USDT');
  rate(state, 'VES', 'USD', '2');
  rate(state, 'VES', 'EUR', '1.8');
  rate(state, 'USD', 'VES', '0.5');
  rate(state, 'USD', 'EUR', '0.9');
  rate(state, 'EUR', 'USD', '1.1');
  rate(state, 'EUR', 'VES', '0.7');

  const ves = await getDashboard(harness, 'VES');
  assert.deepEqual(ves.accounts.map(({ id }) => id), ['ves']);
  assert.equal(ves.totals.amount, '24.00');
  assert.equal(ves.flow.income, '4.00');
  assert.deepEqual(ves.recentActivity.map(({ id }) => id), ['ves-income']);
  assert.equal(ves.comparison.valuations.USD.current.amount, '24.00');
  assert.equal(ves.comparison.valuations.USD.current.partial, false);
  assert.equal(ves.comparison.valuations.EUR.current.amount, '21.60');

  const usd = await getDashboard(harness, 'USD');
  assert.deepEqual(usd.accounts.map(({ id }) => id), ['usd']);
  assert.equal(usd.totals.amount, '4.00');
  assert.equal(usd.flow.expense, '1.00');
  assert.deepEqual(usd.recentActivity.map(({ id }) => id), ['usd-expense']);
  assert.equal(usd.comparison.valuations.EUR.current.amount, '3.60');
  assert.equal(usd.comparison.valuations.EUR.current.partial, false);

  const all = await getDashboard(harness);
  assert.deepEqual(all.accounts.map(({ id }) => id), ['ves', 'usd', 'eur', 'usdt']);
  assert.deepEqual(
    all.recentActivity.map(({ id }) => id).sort(),
    ['eur-income', 'usd-expense', 'usdt-income', 'ves-income'],
  );
  assert.equal(all.totals.partial, true);
  assert.equal(all.flow.partial, true);
  assert.deepEqual(all.comparison.valuations.USD.current.missingCurrencies, ['USDT']);
});

test('dashboard currency filter rejects every value outside its strict allowlist', async () => {
  const harness = dashboardHarness();
  for (const accountCurrency of ['EUR', 'USDT', 'ves', '', 'VES,USD', ['VES']]) {
    await assert.rejects(
      getDashboard(harness, accountCurrency),
      (error) => typeof error.getStatus === 'function' && error.getStatus() === 422,
    );
  }
});

test('authenticated dashboard controller forwards the accountCurrency query', async () => {
  const harness = dashboardHarness();
  harness.state.accounts.push(account('ves', 'VES', '10'), account('usd', 'USD', '5'));
  const controller = new DashboardController(harness.dashboard);

  const result = await controller.get({ user: { sub: 'owner' } }, undefined, undefined, 'VES');

  assert.deepEqual(result.accounts.map(({ id }) => id), ['ves']);
});
