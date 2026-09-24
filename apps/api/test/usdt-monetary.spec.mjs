import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';
import { Prisma } from '@prisma/client';

const { AppError } = await import('../src/common/errors.ts');
const { transferHarness, dashboardHarness } = await import('./fixtures/monetary-harness.mjs');
const finance = await import('../src/modules/p0-finance.ts');
const { record, requiredString } = await import('../src/common/request-input.ts');
const { OnboardingService, TransfersService } = await import('../src/modules/p0-monetary.ts');
const { AccountsService } = await import('../src/modules/accounts.ts');

const invalid = (action) =>
  assert.throws(action, (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');

test('supported codes require an active string identity', () => {
  assert.equal(finance.code('USDT'), 'USDT');
  for (const value of [123, null, ['USDT'], { code: 'USDT' }, 'usdt', 'ABCD']) {
    invalid(() => finance.code(value));
  }
});

test('shared request guards narrow only records and nonempty strings', () => {
  assert.deepEqual(record(['USDT']), {});
  assert.deepEqual(record(null), {});
  assert.deepEqual(record({ code: 'USDT' }), { code: 'USDT' });
  assert.equal(requiredString('  account  ', 'Required'), 'account');
  invalid(() => requiredString(123, 'Required'));
});

test('native input preserves six digits, zero, and redundant trailing zeros losslessly', () => {
  assert.equal(finance.nativeAmount('1.234567', 'USDT', 'positive'), '1.234567');
  assert.equal(finance.nativeAmount('1.23456700', 'USDT', 'positive'), '1.234567');
  assert.equal(finance.nativeAmount('0', 'USDT', 'non-negative'), '0.000000');
  assert.equal(finance.nativeAmount(undefined, 'USDT', 'non-negative'), '0.000000');
  assert.equal(finance.nativeAmount('1.20', 'USD', 'positive'), '1.20');
  for (const value of [1.25, null, [], {}, '0.0000001', '1.2345671', '-1', '1e2']) {
    invalid(() => finance.nativeAmount(value, 'USDT', 'positive'));
  }
  invalid(() => finance.nativeAmount('0.0000000', 'USDT', 'positive'));
});

test('amount and rate columns reject overflow and fractional loss', () => {
  assert.equal(finance.nativeAmount('999999999999.123456', 'USDT', 'positive'), '999999999999.123456');
  invalid(() => finance.nativeAmount('1000000000000', 'USDT', 'positive'));
  invalid(() => finance.storedAmount('1000000000000.00'));
  invalid(() => finance.storedAmount('1.000000001'));
  assert.equal(finance.storedAmount('1.2345678900'), '1.23456789');
  assert.equal(finance.storedRate('0.0000001'), '0.0000001');
  assert.equal(finance.storedRate('0.00000000000100'), '0.000000000001');
  invalid(() => finance.storedRate('0.0000000000001'));
  invalid(() => finance.storedRate('1000000000000'));
  invalid(() => finance.storedRate('0'));
  invalid(() => finance.storedRate('-1'));
  invalid(() => finance.storedRate(1.005));
});

test('trusted Prisma Decimal reads remain plain and historical high-scale reads are not rewritten', () => {
  assert.equal(finance.decimalText(new Prisma.Decimal('0.0000001')), '0.0000001');
  assert.equal(finance.asString(new Prisma.Decimal('0.0000001')), '0.0000001');
  assert.equal(finance.fixedAmount(new Prisma.Decimal('1.23456789'), 6), '1.234568');
  assert.equal(finance.decimalText(new Prisma.Decimal('1.23456789')), '1.23456789');
  assert.equal(finance.fixedAmount('-1.005', 2), '-1.01');
  assert.equal(finance.fixedAmount('0', 6), '0.000000');
});

test('directional FX uses the full rate and rounds only target money', () => {
  assert.equal(finance.convertAmount('1.234567', 'USDT', 'USD', '1.005'), '1.24');
  assert.equal(finance.convertAmount('1.234567', 'USDT', 'VES', '36.5'), '45.06');
  assert.equal(finance.convertAmount('1.00', 'USD', 'USDT', '1.2345675'), '1.234568');
  assert.equal(finance.convertAmount('-1.000000', 'USDT', 'USD', '1.005'), '-1.01');
  assert.equal(finance.convertAmount('0.000000', 'USDT', 'USD', '1.005'), '0.00');
  invalid(() => finance.convertAmount('1.00', 'USD', 'USDT', '0'));
});

test('onboarding persists independent USDT base/account selection and reloads six-decimal zero', async () => {
  const state = { accounts: [], preferences: null, currencies: [] };
  const prisma = {
    currency: { upsert: async ({ create }) => { state.currencies.push(structuredClone(create)); } },
    account: {
      create: async ({ data }) => {
        const row = { ...data, id: 'first', archivedAt: null, currency: { code: data.currencyCode, precision: 6 } };
        state.accounts.push(structuredClone(row));
        return row;
      },
      findMany: async ({ where }) => structuredClone(state.accounts.filter((row) => row.userId === where.userId)),
    },
    userPreferences: { upsert: async ({ create }) => { state.preferences = structuredClone(create); },
      findUnique: async () => structuredClone(state.preferences) },
    ledgerEntry: { findMany: async () => [] },
    $transaction: async (run) => {
      const before = structuredClone(state);
      try { return await run(prisma); } catch (error) { Object.assign(state, before); throw error; }
    },
  };
  const idem = { replay: async () => undefined, save: async () => undefined };
  const onboarding = new OnboardingService(prisma, idem);
  const accountService = new AccountsService(prisma, idem);
  const result = await onboarding.complete('user-1', undefined, { baseCurrency: 'USDT', accountCurrency: 'USDT',
    timezone: 'UTC', accountName: 'USDT', openingBalance: '0' });
  assert.equal(result.baseCurrency, 'USDT');
  assert.equal((await onboarding.get('user-1')).baseCurrency, 'USDT');
  assert.equal(state.accounts[0].openingBalance, '0.000000');
  assert.equal((await accountService.list('user-1'))[0].balance, '0.000000');
  assert.deepEqual(state.currencies.map((row) => row.code), ['USDT', 'USDT']);
  const independent = await onboarding.complete('user-2', undefined, { baseCurrency: 'USD', accountCurrency: 'USDT',
    timezone: 'UTC', accountName: 'Savings', openingBalance: '1.234567' });
  assert.equal(independent.baseCurrency, 'USD');
  assert.equal(state.accounts[1].currencyCode, 'USDT');
  assert.equal(state.accounts[1].openingBalance, '1.234567');
  assert.equal((await accountService.list('user-2'))[0].balance, '1.234567');
  const before = structuredClone(state);
  await assert.rejects(onboarding.complete('user-3', undefined, { baseCurrency: 'USD', accountCurrency: 'USDT',
    timezone: 'UTC', accountName: 'Bad', openingBalance: '0.0000001' }),
  (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
  assert.deepEqual(state, before);
});

const fxHarness = () => {
  const state = { rates: [], transactions: [], ledger: [], snapshots: [], transfers: [], transferSnapshots: [], currencies: [] };
  const category = { id: 'category', userId: 'owner', archivedAt: null };
  let revokeBeforePosting = null;
  const accounts = [
    { id: 'usd', userId: 'owner', currencyCode: 'USD', openingBalance: '10.00', archivedAt: null,
      currency: { code: 'USD', precision: 2 } },
    { id: 'usdt', userId: 'owner', currencyCode: 'USDT', openingBalance: '2.000000', archivedAt: null,
      currency: { code: 'USDT', precision: 6 } },
  ];
  const copy = (value) => structuredClone(value);
  const transaction = { create: async ({ data }) => {
    const row = { ...data, id: `tx-${state.transactions.length + 1}`, note: data.note ?? null,
      categoryId: data.categoryId ?? null, voidedAt: null };
    state.transactions.push(copy(row));
    return copy(row);
  } };
  const prisma = {
    account: { findFirst: async ({ where }) => copy(accounts.find((row) => row.id === where.id && row.userId === where.userId) ?? null) },
    category: { findFirst: async ({ where }) => copy(category.id === where.id && category.userId === where.userId && !category.archivedAt ? category : null) },
    currency: { upsert: async ({ create }) => { state.currencies.push(copy(create)); } },
    fxRate: { findFirst: async ({ where, orderBy }) => {
      assert.equal(orderBy.effectiveAt, 'desc');
      const eligible = state.rates.filter((row) => row.baseCode === where.baseCode &&
        row.quoteCode === where.quoteCode && row.effectiveAt <= where.effectiveAt.lte);
      return copy(eligible.sort((a, b) => b.effectiveAt - a.effectiveAt)[0] ?? null);
    } },
    ledgerEntry: {
      create: async ({ data }) => { state.ledger.push(copy(data)); },
      createMany: async ({ data }) => { state.ledger.push(...copy(data)); },
      findMany: async ({ where }) => copy(state.ledger.filter((row) => row.accountId === where.accountId)),
    },
    transaction,
    transactionFxSnapshot: { create: async ({ data }) => { state.snapshots.push(copy(data)); } },
    transfer: { create: async ({ data }) => {
      const row = { ...data, id: `transfer-${state.transfers.length + 1}` };
      state.transfers.push(copy(row));
      return copy(row);
    } },
    fxSnapshot: { create: async ({ data }) => { state.transferSnapshots.push(copy(data)); } },
    $transaction: async (run) => {
      const before = copy(state);
      revokeBeforePosting?.();
      try { return await run(prisma); } catch (error) { Object.assign(state, before); throw error; }
    },
  };
  const idem = { replay: async () => undefined, save: async () => undefined };
  return { state, accountRows: accounts, category, revoke: (change) => { revokeBeforePosting = change; },
    accounts: new AccountsService(prisma, idem), transfers: new TransfersService(prisma, idem) };
};

const at = (value) => new Date(value);
const expense = (manualRate) => ({ kind: 'EXPENSE', amount: '1.000000', currencyCode: 'USDT',
  categoryId: 'category', occurredAt: '2026-09-22T12:00:00.000Z', ...(manualRate === undefined ? {} : { manualRate }) });

test('transaction snapshots retain selected historical MARKET and MANUAL row evidence after later rates', async () => {
  for (const source of ['MARKET', 'MANUAL']) {
    const { state, accounts } = fxHarness();
    const effectiveAt = at('2026-09-21T00:00:00.000Z');
    state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.01', source, effectiveAt });
    state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.05', source: 'MARKET',
      effectiveAt: at('2026-09-23T00:00:00.000Z') });
    await accounts.transaction('owner', 'usd', undefined, expense());
    assert.equal(state.ledger[0].signedAmount, '-1.01');
    assert.deepEqual(state.snapshots[0], { transactionId: 'tx-1', sourceCurrency: 'USDT', baseCurrency: 'USD',
      sourceAmount: '1.000000', baseAmount: '1.01', rate: '1.01', source, effectiveAt });
    const recorded = structuredClone({ transactions: state.transactions, ledger: state.ledger, snapshots: state.snapshots });
    state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.10', source: 'MARKET',
      effectiveAt: at('2026-09-22T13:00:00.000Z') });
    assert.deepEqual({ transactions: state.transactions, ledger: state.ledger, snapshots: state.snapshots }, recorded);
  }
});

test('explicit manual rate uses operation time; zero and negative rates cannot post', async () => {
  const { state, accounts, transfers } = fxHarness();
  await accounts.transaction('owner', 'usd', undefined, expense('1.02'));
  assert.equal(state.snapshots[0].source, 'MANUAL');
  assert.equal(state.snapshots[0].effectiveAt.toISOString(), expense().occurredAt);
  assert.equal(state.snapshots[0].baseAmount, '1.02');
  for (const rate of ['0', '-1']) {
    const before = structuredClone(state);
    await assert.rejects(accounts.transaction('owner', 'usd', undefined, expense(rate)),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
    await assert.rejects(transfers.create('owner', undefined, { sourceAccountId: 'usdt', destinationAccountId: 'usd',
      amount: '1.000000', manualRate: rate }),
    (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
    assert.deepEqual(state, before);
  }
});

test('future and reverse-only FX cannot create a transaction or transfer or change balances', async () => {
  const { state, accountRows, accounts, transfers } = fxHarness();
  state.rates.push({ baseCode: 'USD', quoteCode: 'USDT', rate: '2', source: 'MARKET',
    effectiveAt: at('2026-09-21T00:00:00.000Z') });
  state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.05', source: 'MARKET',
    effectiveAt: at('2026-09-23T00:00:00.000Z') });
  const before = structuredClone(state);
  const balances = structuredClone(accountRows.map((row) => row.openingBalance));
  const missing = (error) => error instanceof AppError && error.code === 'MISSING_FX_RATE' && error.status === 422;
  await assert.rejects(accounts.transaction('owner', 'usd', undefined, expense()), missing);
  await assert.rejects(transfers.create('owner', undefined, { sourceAccountId: 'usdt', destinationAccountId: 'usd',
    amount: '1.000000', occurredAt: expense().occurredAt }), missing);
  assert.deepEqual(state, before);
  assert.deepEqual(accountRows.map((row) => row.openingBalance), balances);
});

test('account or category ownership lost before posting denies transaction without financial writes', async () => {
  for (const resource of ['account', 'category']) {
    const harness = fxHarness();
    harness.revoke(() => {
      if (resource === 'account') harness.accountRows[0].userId = 'another-user';
      else harness.category.userId = 'another-user';
    });
    const before = financialRows(harness.state);
    await assert.rejects(harness.accounts.transaction('owner', 'usd', undefined,
      { kind: 'INCOME', amount: '1.00', currencyCode: 'USD', categoryId: 'category' }),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND');
    assert.deepEqual(financialRows(harness.state), before);
    assert.equal(harness.accountRows[0].openingBalance, '10.00');
  }
});

test('another user cannot post against an account or category', async () => {
  const harness = fxHarness();
  const before = financialRows(harness.state);
  for (const [user, accountId, categoryId] of [
    ['another-user', 'usd', 'category'], ['owner', 'usd', 'another-category'],
  ]) {
    await assert.rejects(harness.accounts.transaction(user, accountId, undefined,
      { kind: 'INCOME', amount: '1.00', currencyCode: 'USD', categoryId }),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND');
    assert.deepEqual(financialRows(harness.state), before);
  }
});

test('transfer records selected direct historical source and effective time without later repricing', async () => {
  const { state, transfers } = fxHarness();
  const effectiveAt = at('2026-09-21T00:00:00.000Z');
  state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.005', source: 'MANUAL', effectiveAt });
  const transfer = await transfers.create('owner', undefined, { sourceAccountId: 'usdt',
    destinationAccountId: 'usd', amount: '1.000000', occurredAt: expense().occurredAt });
  assert.equal(transfer.destinationAmount, '1.01');
  assert.deepEqual(state.transferSnapshots[0], { transferId: transfer.id, source: 'MANUAL', effectiveAt,
    rates: { create: { baseCode: 'USDT', quoteCode: 'USD', rate: '1.005' } } });
  const recorded = structuredClone({ transfers: state.transfers, transactions: state.transactions,
    ledger: state.ledger, snapshots: state.transferSnapshots });
  state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.10', source: 'MARKET',
    effectiveAt: at('2026-09-22T13:00:00.000Z') });
  assert.deepEqual({ transfers: state.transfers, transactions: state.transactions,
    ledger: state.ledger, snapshots: state.transferSnapshots }, recorded);
});

const transferRequest = (changes = {}) => ({ sourceAccountId: 'source', destinationAccountId: 'target',
  amount: '1.234567', occurredAt: '2026-09-22T12:00:00.000Z', ...changes });
const financialRows = (state) => structuredClone({ transfers: state.transfers, transactions: state.transactions,
  ledger: state.ledger, snapshots: state.snapshots, snapshotRates: state.snapshotRates });

test('same-unit transfer posts one micro USDT on each side without FX', async () => {
  const harness = transferHarness();
  harness.state.accounts[1].currencyCode = 'USDT';
  harness.state.accounts[1].currency = { code: 'USDT', precision: 6 };
  harness.state.accounts[1].openingBalance = '0.000000';
  const result = await harness.transfers.create('owner', undefined, transferRequest({ amount: '0.000001' }));
  assert.equal(result.sourceAmount, '0.000001');
  assert.equal(result.destinationAmount, '0.000001');
  assert.equal(harness.balance('source'), '1.999999');
  assert.equal(harness.balance('target'), '0.000001');
  assert.deepEqual(harness.state.ledger.map((entry) => entry.signedAmount), ['-0.000001', '0.000001']);
  assert.deepEqual(harness.state.snapshots, []);
});

test('cross-unit transfer preserves target precision, evidence and unchanged-key replay', async () => {
  const harness = transferHarness();
  const body = transferRequest({ manualRate: '36.5' });
  const first = await harness.transfers.create('owner', 'same-key', body);
  assert.deepEqual(await harness.transfers.create('owner', 'same-key', body), first);
  assert.equal(first.sourceAmount, '1.234567');
  assert.equal(first.destinationAmount, '45.06');
  assert.equal(harness.balance('source'), '0.765433');
  assert.equal(harness.balance('target'), '145.06');
  assert.deepEqual(harness.state.ledger.map((entry) => entry.signedAmount), ['-1.234567', '45.06']);
  assert.equal(harness.state.transfers.length, 1);
  assert.equal(harness.state.transactions.length, 2);
  assert.deepEqual(harness.state.snapshotRates.map(({ baseCode, quoteCode, rate }) =>
    ({ baseCode, quoteCode, rate })), [{ baseCode: 'USDT', quoteCode: 'VES', rate: '36.5' }]);
  assert.equal(harness.state.snapshots[0].source, 'MANUAL');
  assert.equal(harness.state.snapshots[0].effectiveAt.toISOString(), body.occurredAt);
  const recorded = financialRows(harness.state);
  harness.state.rates.push({ baseCode: 'USDT', quoteCode: 'VES', rate: '40', source: 'MARKET',
    effectiveAt: new Date('2026-09-22T13:00:00.000Z') });
  assert.deepEqual(financialRows(harness.state), recorded);
  assert.deepEqual(await harness.transfers.create('owner', 'same-key', body), first);
  assert.deepEqual(financialRows(harness.state), recorded);
  const dashboard = await harness.dashboard.get('owner', '2026-09-22T00:00:00.000Z', '2026-09-22T23:59:59.000Z');
  assert.equal(dashboard.flow.income, '0.000000');
  assert.equal(dashboard.flow.expense, '0.000000');
});

test('missing direct rate leaves balances and every financial table unchanged', async () => {
  const harness = transferHarness();
  harness.state.rates.push({ baseCode: 'VES', quoteCode: 'USDT', rate: '2', source: 'MARKET',
    effectiveAt: new Date('2026-09-21') });
  const before = financialRows(harness.state);
  const balances = [harness.balance('source'), harness.balance('target')];
  await assert.rejects(harness.transfers.create('owner', undefined, transferRequest()),
    (error) => error instanceof AppError && error.code === 'MISSING_FX_RATE' && error.status === 422);
  assert.deepEqual(financialRows(harness.state), before);
  assert.deepEqual([harness.balance('source'), harness.balance('target')], balances);
});

test('ownership lost before transfer posting denies either foreign account with no writes', async () => {
  for (const id of ['source', 'target']) {
    const harness = transferHarness();
    harness.revokeBeforePosting(id);
    const before = financialRows(harness.state);
    const balances = [harness.balance('source'), harness.balance('target')];
    await assert.rejects(harness.transfers.create('owner', undefined,
      transferRequest({ manualRate: '36.5' })),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND');
    assert.deepEqual(financialRows(harness.state), before);
    assert.deepEqual([harness.balance('source'), harness.balance('target')], balances);
  }
});

test('another user cannot transfer from or into an owned account', async () => {
  const harness = transferHarness();
  const before = financialRows(harness.state);
  for (const [sourceAccountId, destinationAccountId] of [
    ['foreign', 'target'], ['source', 'foreign'],
  ]) {
    await assert.rejects(harness.transfers.create('owner', undefined,
      transferRequest({ sourceAccountId, destinationAccountId, manualRate: '36.5' })),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND');
    assert.deepEqual(financialRows(harness.state), before);
  }
});

test('transfer rejects unrepresentable native source and fee before any financial write', async () => {
  for (const changes of [{ amount: '0.0000001' }, { feeAmount: '0.0000001' },
    { amount: 1.25 }, { feeAmount: 1.25 }]) {
    const harness = transferHarness();
    const before = financialRows(harness.state);
    await assert.rejects(harness.transfers.create('owner', undefined,
      transferRequest({ ...changes, manualRate: '36.5' })),
    (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
    assert.deepEqual(financialRows(harness.state), before);
    assert.deepEqual([harness.balance('source'), harness.balance('target')], ['2.000000', '100.00']);
  }
});

test('source-unit transfer fee remains a separate signed expense posting', async () => {
  const harness = transferHarness();
  const result = await harness.transfers.create('owner', undefined,
    transferRequest({ amount: '1.000000', feeAmount: '0.000002', manualRate: '36.5' }));
  assert.equal(result.feeAmount, '0.000002');
  assert.deepEqual(harness.state.ledger.map((entry) => entry.signedAmount),
    ['-1.000000', '36.50', '-0.000002']);
  assert.equal(harness.balance('source'), '0.999998');
  assert.equal(harness.state.transactions[2].note, 'Transfer fee');
});

test('failure after first posting or during snapshot creation rolls back both balances and all rows', async () => {
  for (const step of ['first-posting', 'snapshot']) {
    const harness = transferHarness();
    harness.failAt(step);
    const before = financialRows(harness.state);
    const balances = [harness.balance('source'), harness.balance('target')];
    await assert.rejects(harness.transfers.create('owner', 'failed-key', transferRequest({ manualRate: '36.5' })),
      new RegExp(step === 'snapshot' ? 'snapshot failed' : 'first posting failed'));
    assert.equal(harness.postingCount, step === 'snapshot' ? 2 : 1);
    assert.deepEqual(financialRows(harness.state), before);
    assert.deepEqual([harness.balance('source'), harness.balance('target')], balances);
  }
});

const dashboardAccount = (id, currencyCode, openingBalance) => ({ id, userId: 'owner',
  currencyCode, openingBalance, archivedAt: null, createdAt: at('2026-09-01'),
  currency: { code: currencyCode, precision: currencyCode === 'USDT' ? 6 : 2 } });
const dashboardTransaction = (id, kind, amount, currencyCode, occurredAt, changes = {}) => ({
  id, userId: 'owner', accountId: 'usdt', kind, amount, currencyCode, occurredAt: at(occurredAt),
  voidedAt: null, note: null, categoryId: null, transferId: null, fxSnapshot: null, ...changes,
});
const dashboardPeriod = ['2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z'];

test('dashboard preserves USD subtotal and native USDT balance without assuming parity', async () => {
  const { state, dashboard } = dashboardHarness();
  state.accounts.push(dashboardAccount('usd', 'USD', '10.00'),
    dashboardAccount('usdt', 'USDT', '2.123456'));
  state.transactions.push(dashboardTransaction('income', 'INCOME', '0.123456', 'USDT',
    '2026-09-12T12:00:00.000Z'));
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.totals, { amount: '10.00', partial: true,
    warnings: ['Missing FX rate for USDT/USD'] });
  assert.deepEqual(result.flow, { income: '0.00', expense: '0.00', partial: true,
    warnings: ['Missing historical FX rate for USDT/USD'] });
  assert.deepEqual(result.accounts.map(({ balance }) => balance), ['10.00', '2.123456']);
});

test('dashboard converts historical flow using eligible direct evidence and prefers recorded snapshots', async () => {
  const { state, dashboard } = dashboardHarness();
  state.accounts.push(dashboardAccount('usdt', 'USDT', '1.000000'));
  state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.005',
    effectiveAt: at('2026-09-10T00:00:00.000Z') },
  { baseCode: 'USDT', quoteCode: 'USD', rate: '2',
    effectiveAt: at('2026-09-20T00:00:00.000Z') });
  state.transactions.push(dashboardTransaction('rate', 'INCOME', '1.000000', 'USDT',
    '2026-09-12T12:00:00.000Z'), dashboardTransaction('snapshot', 'EXPENSE', '0.500000', 'USDT',
    '2026-09-12T13:00:00.000Z', { fxSnapshot: { baseCurrency: 'USD', baseAmount: '0.49' } }));
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.flow, { income: '1.01', expense: '0.49', partial: false, warnings: [] });
  assert.deepEqual(result.totals, { amount: '2.00', partial: false, warnings: [] });
});

test('future-only and reverse-only rates cannot complete historical flow or hide native activity', async () => {
  const { state, dashboard } = dashboardHarness();
  state.accounts.push(dashboardAccount('usd', 'USD', '10.00'));
  state.transactions.push(dashboardTransaction('income', 'INCOME', '0.123456', 'USDT',
    '2026-09-12T12:00:00.000Z'));
  state.rates.push({ baseCode: 'USDT', quoteCode: 'USD', rate: '1.05',
    effectiveAt: at('2026-09-13T00:00:00.000Z') },
  { baseCode: 'USD', quoteCode: 'USDT', rate: '2', effectiveAt: at('2026-09-01') });
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.totals, { amount: '10.00', partial: false, warnings: [] });
  assert.deepEqual(result.flow, { income: '0.00', expense: '0.00', partial: true,
    warnings: ['Missing historical FX rate for USDT/USD'] });
  assert.equal(result.recentActivity[0].amount, '0.123456');
  assert.equal(result.recentActivity[0].currencyCode, 'USDT');
});

test('dashboard sums full period beyond fifty activity rows and keeps transfer principal excluded', async () => {
  const { state, dashboard } = dashboardHarness();
  state.accounts.push(dashboardAccount('usd', 'USD', '0.00'));
  for (let index = 0; index < 55; index++) {
    state.transactions.push(dashboardTransaction(`income-${index}`, 'INCOME', '1.00', 'USD',
      `2026-09-${String(index % 28 + 1).padStart(2, '0')}T12:00:00.000Z`));
  }
  state.transactions.push(dashboardTransaction('transfer', 'INCOME', '100.00', 'USD',
    '2026-09-29T12:00:00.000Z', { transferId: 'internal' }));
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.flow, { income: '55.00', expense: '0.00', partial: false, warnings: [] });
  assert.equal(result.recentActivity.length, 50);
  assert.ok(result.recentActivity.some(({ id }) => id === 'transfer'));
  assert.ok(state.queries.includes(50));
  assert.ok(state.queries.includes(undefined));
});

test('complete USDT dashboard retains six-decimal income, expense and balance', async () => {
  const { state, dashboard } = dashboardHarness('USDT');
  state.accounts.push(dashboardAccount('usdt', 'USDT', '0.000000'));
  state.ledger.push({ accountId: 'usdt', signedAmount: '1.234567' },
    { accountId: 'usdt', signedAmount: '-0.000001' });
  state.transactions.push(dashboardTransaction('income', 'INCOME', '1.234567', 'USDT',
    '2026-09-12T12:00:00.000Z'), dashboardTransaction('expense', 'EXPENSE', '0.000001', 'USDT',
    '2026-09-13T12:00:00.000Z'));
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.totals, { amount: '1.234566', partial: false, warnings: [] });
  assert.deepEqual(result.flow, { income: '1.234567', expense: '0.000001', partial: false, warnings: [] });
  assert.equal(result.accounts[0].balance, '1.234566');
});

test('empty USDT dashboard has genuine six-decimal zeros without warnings', async () => {
  const { dashboard } = dashboardHarness('USDT');
  const result = await dashboard.get('owner', ...dashboardPeriod);
  assert.deepEqual(result.totals, { amount: '0.000000', partial: false, warnings: [] });
  assert.deepEqual(result.flow, { income: '0.000000', expense: '0.000000', partial: false, warnings: [] });
  assert.deepEqual(result.recentActivity, []);
});
