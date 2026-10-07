import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';
const { dashboardHarness } = await import('./fixtures/monetary-harness.mjs');

const date = (value) => new Date(value);
const clock = date('2026-10-12T12:00:00Z');
const account = (id, currencyCode, openingBalance, createdAt = '2026-08-01T00:00:00Z', archivedAt = null) => ({
  id, userId: 'owner', currencyCode, openingBalance, createdAt: date(createdAt),
  archivedAt: archivedAt ? date(archivedAt) : null, currency: { code: currencyCode, precision: currencyCode === 'USDT' ? 6 : 2 },
});
const posting = (state, id, accountId, signedAmount, occurredAt, voidedAt = null, transferId = null) => {
  state.transactions.push({ id, accountId, userId: 'owner', kind: signedAmount.startsWith('-') ? 'EXPENSE' : 'INCOME',
    amount: signedAmount.replace('-', ''), currencyCode: state.accounts.find((row) => row.id === accountId).currencyCode,
    occurredAt: date(occurredAt), voidedAt: voidedAt ? date(voidedAt) : null, transferId,
    fxSnapshot: null, note: null, categoryId: null });
  state.ledger.push({ transactionId: id, accountId, signedAmount });
};
const rate = (state, baseCode, quoteCode, value, effectiveAt, source = 'MARKET') =>
  state.rates.push({ baseCode, quoteCode, rate: value, effectiveAt: date(effectiveAt), source });
const comparison = async (harness, at = clock) => (await harness.dashboard.get('owner',
  '2026-10-01T00:00:00Z', '2026-10-12T12:00:00Z', at)).comparison;

test('historical membership, archived accounts, opening approximation, voids and both transfer legs', async () => {
  const harness = dashboardHarness();
  const { state } = harness;
  state.accounts.push(account('old', 'USD', '10'), account('archived', 'USD', '5',
    '2026-08-01T00:00:00Z', '2026-10-03T00:00:00Z'),
  account('new', 'USD', '7', '2026-10-01T00:00:00Z'),
  account('future', 'USD', '999', '2026-11-01T00:00:00Z'));
  posting(state, 'backdated', 'old', '2', '2026-09-10T00:00:00Z');
  posting(state, 'out', 'old', '-3', '2026-09-11T00:00:00Z', null, 'transfer');
  posting(state, 'in', 'archived', '3', '2026-09-11T00:00:00Z', null, 'transfer');
  posting(state, 'void', 'old', '200', '2026-09-12T00:00:00Z', '2026-10-02T00:00:00Z');
  posting(state, 'boundary', 'old', '4', '2026-10-01T00:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.previousCutoff, '2026-10-01T00:00:00.000Z');
  assert.equal(result.openingBalanceDate, 'ACCOUNT_CREATED_AT_APPROXIMATION');
  assert.equal(result.valuations.USD.previous.amount, '17.00');
  assert.equal(result.valuations.USD.current.amount, '20.00');
  assert.equal(result.valuations.USD.percentChange, '17.65');
});

test('previous month start respects timezone and excludes an entry exactly at cutoff', async () => {
  const harness = dashboardHarness('USD', 'America/New_York');
  harness.state.accounts.push(account('old', 'USD', '10'));
  posting(harness.state, 'before', 'old', '2', '2026-10-01T03:59:59Z');
  posting(harness.state, 'at', 'old', '4', '2026-10-01T04:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.previousCutoff, '2026-10-01T04:00:00.000Z');
  assert.equal(result.valuations.USD.previous.amount, '12.00');
  assert.equal(result.valuations.USD.current.amount, '16.00');
});

test('each period uses only its direct dated rate and reports missing currency and quote provenance', async () => {
  const harness = dashboardHarness();
  const { state } = harness;
  state.accounts.push(account('usd', 'USD', '10'), account('stable', 'USDT', '2.000000'),
    account('eur', 'EUR', '3'));
  rate(state, 'USDT', 'USD', '1.5', '2026-09-20T00:00:00Z', 'MANUAL');
  rate(state, 'USDT', 'USD', '2', '2026-10-02T00:00:00Z');
  rate(state, 'EUR', 'USD', '3', '2026-10-02T00:00:00Z');
  rate(state, 'USD', 'VES', '40', '2026-10-02T00:00:00Z');
  const result = await comparison(harness);
  assert.deepEqual(result.valuations.USD.previous.missingCurrencies, ['EUR']);
  assert.equal(result.valuations.USD.previous.amount, '13.00');
  assert.equal(result.valuations.USD.previous.partial, true);
  assert.equal(result.valuations.USD.current.amount, '23.00');
  assert.equal(result.valuations.USD.percentChange, null);
  assert.deepEqual(result.valuations.USD.previous.quotes, [{ baseCurrency: 'USDT',
    effectiveAt: '2026-09-20T00:00:00.000Z', source: 'MANUAL' }]);
  assert.deepEqual(result.valuations.VES.current.missingCurrencies, ['USDT', 'EUR']);
  assert.equal(result.valuations.VES.current.amount, '400.00');
  assert.equal(result.valuations.EUR.current.partial, true);
});

test('rate exactly at previous boundary and reverse-only rates do not imply historical parity or crosses', async () => {
  const harness = dashboardHarness();
  harness.state.accounts.push(account('stable', 'USDT', '2.000000'));
  rate(harness.state, 'USDT', 'USD', '1', '2026-10-01T00:00:00Z');
  rate(harness.state, 'VES', 'USDT', '2', '2026-09-01T00:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.valuations.USD.previous.partial, true);
  assert.equal(result.valuations.USD.current.amount, '2.00');
  assert.deepEqual(result.valuations.VES.previous.missingCurrencies, ['USDT']);
  assert.equal(result.valuations.USD.percentChange, null);
});

test('exact large-decimal percentage supports negative changes and suppresses zero prior', async () => {
  const harness = dashboardHarness();
  harness.state.accounts.push(account('usd', 'USD', '9007199254740993.00'));
  posting(harness.state, 'debit', 'usd', '-4503599627370496.50', '2026-10-02T00:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.valuations.USD.percentChange, '-50.00');
  const empty = dashboardHarness();
  assert.equal((await comparison(empty)).valuations.USD.percentChange, null);
});

test('opening at cutoff, later postings and zero rates cannot manufacture a historical balance', async () => {
  const harness = dashboardHarness();
  harness.state.accounts.push(account('old', 'USD', '5'),
    account('boundary', 'USD', '10', '2026-10-01T00:00:00Z'),
    account('stable', 'USDT', '1.000000'));
  posting(harness.state, 'future', 'old', '100', '2026-10-13T00:00:00Z');
  rate(harness.state, 'USDT', 'USD', '0', '2026-09-20T00:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.valuations.USD.previous.amount, '5.00');
  assert.equal(result.valuations.USD.current.amount, '15.00');
  assert.deepEqual(result.valuations.USD.previous.missingCurrencies, ['USDT']);
  assert.equal(result.valuations.USD.percentChange, null);
});

test('current as-of quote accepts an exact cutoff timestamp without admitting a future quote', async () => {
  const harness = dashboardHarness();
  harness.state.accounts.push(account('stable', 'USDT', '1.000000'));
  rate(harness.state, 'USDT', 'USD', '2', '2026-10-12T12:00:00Z');
  rate(harness.state, 'USDT', 'USD', '3', '2026-10-13T00:00:00Z');
  const result = await comparison(harness);
  assert.equal(result.valuations.USD.current.amount, '2.00');
  assert.deepEqual(result.valuations.USD.current.quotes, [{ baseCurrency: 'USDT',
    effectiveAt: clock.toISOString(), source: 'MARKET' }]);
});
