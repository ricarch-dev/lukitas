import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const [{ AppError }, { AccountsController, AccountsService }, { p0Controllers, p0Providers }] =
  await Promise.all([
    import('../src/common/errors.ts'),
    import('../src/modules/accounts.ts'),
    import('../src/modules/p0.module.ts'),
  ]);

const createHarness = () => {
  const persistedOpeningBalances = [];
  const account = {
    id: 'account-1',
    userId: 'user-1',
    name: 'Cash',
    currencyCode: 'USD',
    openingBalance: '0',
    archivedAt: null,
    currency: { code: 'USD', precision: 2 },
  };
  const prisma = {
    currency: { upsert: async () => ({}) },
    account: {
      create: async ({ data }) => {
        persistedOpeningBalances.push(data.openingBalance);
        return { ...account, ...data };
      },
      findFirst: async () => account,
    },
  };
  const idempotency = {
    replay: async () => undefined,
    save: async () => undefined,
  };

  return {
    persistedOpeningBalances,
    service: new AccountsService(prisma, idempotency),
  };
};

const accountInput = (openingBalance) => ({
  name: 'Cash',
  currencyCode: 'USD',
  openingBalance,
});

const createPostingHarness = () => {
  const state = { accounts: [], transactions: [], ledger: [], snapshots: [], currencies: [] };
  const copy = (value) => structuredClone(value);
  const account = {
    create: async ({ data }) => {
      const row = { ...data, id: `account-${state.accounts.length + 1}`, archivedAt: null,
        currency: { code: data.currencyCode, precision: data.currencyCode === 'USDT' ? 6 : 2 } };
      state.accounts.push(copy(row));
      return copy(row);
    },
    findFirst: async ({ where }) => copy(state.accounts.find((row) => row.id === where.id && row.userId === where.userId) ?? null),
    findMany: async ({ where }) => copy(state.accounts.filter((row) => row.userId === where.userId && (!where.archivedAt || !row.archivedAt))),
  };
  const prisma = {
    currency: { upsert: async ({ create }) => { state.currencies.push(copy(create)); return create; } },
    account,
    category: { findFirst: async ({ where }) => where.id === 'own' && where.userId === 'user-1' ? { id: 'own' } : null },
    fxRate: { findFirst: async () => null },
    ledgerEntry: { findMany: async ({ where }) => copy(state.ledger.filter((row) => row.accountId === where.accountId).map((row) => ({ signedAmount: row.signedAmount }))) },
    $transaction: async (run) => {
      const before = copy(state);
      try {
        return await run({
          account: { findFirst: account.findFirst },
          category: { findFirst: prisma.category.findFirst },
          transaction: { create: async ({ data }) => {
            const row = { ...data, id: `transaction-${state.transactions.length + 1}`, note: data.note ?? null,
              categoryId: data.categoryId ?? null, voidedAt: null };
            state.transactions.push(copy(row));
            return copy(row);
          } },
          ledgerEntry: { create: async ({ data }) => { state.ledger.push(copy(data)); } },
          transactionFxSnapshot: { create: async ({ data }) => { state.snapshots.push(copy(data)); } },
        });
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    },
  };
  const service = new AccountsService(prisma, { replay: async () => undefined, save: async () => undefined });
  return { state, service, reload: (userId = 'user-1') => service.list(userId) };
};

test('USDT account and native postings retain six decimals after reload with no FX', async () => {
  const { state, service, reload } = createPostingHarness();
  const created = await service.create('user-1', undefined, { name: 'USDT', currencyCode: 'USDT', openingBalance: '1.23456700' });
  assert.equal(created.openingBalance, '1.234567');
  for (const [kind, amount] of [['INCOME', '0.000002'], ['EXPENSE', '0.000001']]) {
    const result = await service.transaction('user-1', created.id, undefined, { kind, amount, currencyCode: 'USDT' });
    assert.equal(result.amount, amount);
  }
  assert.deepEqual(state.transactions.map((row) => row.amount), ['0.000002', '0.000001']);
  assert.deepEqual(state.ledger.map((row) => row.signedAmount), ['0.000002', '-0.000001']);
  assert.equal((await reload())[0].balance, '1.234568');
  assert.deepEqual(state.snapshots, []);
  const fiat = await service.create('user-1', undefined, accountInput('1.20'));
  assert.equal((await reload()).find((row) => row.id === fiat.id).balance, '1.20');
});

test('invalid and foreign account requests cause no financial writes', async () => {
  const { state, service, reload } = createPostingHarness();
  for (const currencyCode of [1, null, ['USDT'], { code: 'USDT' }, 'usdt', 'ABCD']) {
    await assert.rejects(service.create('user-1', undefined, { name: 'Bad', currencyCode, openingBalance: '1.00' }),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
  }
  for (const openingBalance of [1.25, '0.0000001', '1000000000000']) {
    await assert.rejects(service.create('user-1', undefined, { name: 'Bad', currencyCode: 'USDT', openingBalance }),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR');
  }
  assert.deepEqual(state.accounts, []);
  const created = await service.create('user-1', undefined, { name: 'USDT', currencyCode: 'USDT', openingBalance: '1.000000' });
  const financial = () => copyFinancial(state);
  const before = financial();
  const cases = [
    ['user-2', created.id, { kind: 'INCOME', amount: '0.000001', currencyCode: 'USDT' }, 'NOT_FOUND'],
    ['user-1', created.id, { kind: 'INCOME', amount: 1.25, currencyCode: 'USDT' }, 'VALIDATION_ERROR'],
    ['user-1', created.id, { kind: 'INCOME', amount: '0.0000001', currencyCode: 'USDT' }, 'VALIDATION_ERROR'],
    ['user-1', created.id, { kind: 'INCOME', amount: '1.00', currencyCode: 'ABCD' }, 'VALIDATION_ERROR'],
    ['user-1', created.id, { kind: 'INCOME', amount: '1.00', currencyCode: null }, 'VALIDATION_ERROR'],
    ['user-1', created.id, { kind: 'INCOME', amount: '1.00', currencyCode: ['USDT'] }, 'VALIDATION_ERROR'],
    ['user-1', created.id, { kind: 'INCOME', amount: '1.00', currencyCode: 'USD' }, 'CURRENCY_MISMATCH'],
    ['user-1', created.id, { kind: 'INCOME', amount: '1.00', currencyCode: 'USD', categoryId: 'foreign' }, 'NOT_FOUND'],
  ];
  for (const [user, id, body, errorCode] of cases) {
    await assert.rejects(service.transaction(user, id, undefined, body),
      (error) => error instanceof AppError && error.code === errorCode);
    assert.deepEqual(financial(), before);
    assert.equal((await reload())[0].balance, '1.000000');
  }
  state.accounts[0].archivedAt = new Date();
  const archived = financial();
  await assert.rejects(service.transaction('user-1', created.id, undefined,
    { kind: 'INCOME', amount: '0.000001', currencyCode: 'USDT' }),
  (error) => error instanceof AppError && error.code === 'ACCOUNT_ARCHIVED');
  assert.deepEqual(financial(), archived);
});

const copyFinancial = (state) => structuredClone(state);

test('account creation accepts equivalent decimal zeros and returns currency precision', async (t) => {
  for (const openingBalance of ['0', '0.0', '0.00']) {
    await t.test(openingBalance, async () => {
      const harness = createHarness();
      const result = await harness.service.create('user-1', undefined, accountInput(openingBalance));

      assert.deepEqual(harness.persistedOpeningBalances, ['0.00']);
      assert.equal(result.openingBalance, '0.00');
      assert.equal(result.balance, '0.00');
    });
  }
});

test('account creation defaults an omitted opening balance to currency-precision zero', async () => {
  const harness = createHarness();
  const result = await harness.service.create('user-1', undefined, {
    name: 'Cash',
    currencyCode: 'USD',
  });

  assert.deepEqual(harness.persistedOpeningBalances, ['0.00']);
  assert.equal(result.openingBalance, '0.00');
  assert.equal(result.balance, '0.00');
});

test('account creation rejects invalid opening-balance boundary values', async (t) => {
  for (const openingBalance of ['-1', 'invalid', '1e2', '', ' 0.00 ', 0, null]) {
    await t.test(String(openingBalance), async () => {
      const harness = createHarness();

      await assert.rejects(
        harness.service.create('user-1', undefined, accountInput(openingBalance)),
        (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
      );
      assert.deepEqual(harness.persistedOpeningBalances, []);
    });
  }
});

test('transaction amounts remain strictly positive', async () => {
  const harness = createHarness();

  await assert.rejects(
    harness.service.transaction('user-1', 'account-1', undefined, {
      kind: 'INCOME',
      amount: '0.00',
      currencyCode: 'USD',
    }),
    (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
  );
});

test('account rename and archive keep ownership in the write predicate', async () => {
  const row = { id: 'shared', userId: 'owner', name: 'Cash', archivedAt: null,
    openingBalance: '0.00', currency: { code: 'USD', precision: 2 } };
  const prisma = {
    account: {
      findFirst: async ({ where }) => where.id === row.id && where.userId === row.userId ? { ...row } : null,
      update: async ({ where, data }) => {
        if (where.userId !== row.userId) throw new AppError('NOT_FOUND', 'Account not found', 404);
        Object.assign(row, data);
        return { ...row };
      },
    },
    ledgerEntry: { findMany: async () => [] },
  };
  const service = new AccountsService(prisma, { replay: async () => undefined, save: async () => undefined });
  assert.equal((await service.update('owner', 'shared', { name: 'Savings' })).name, 'Savings');
  assert.equal((await service.archive('owner', 'shared', undefined)).archived, true);
  assert.equal(row.name, 'Savings');
  assert.ok(row.archivedAt);
});

test('P0 module wiring retains the extracted account feature', () => {
  assert.equal(p0Providers.includes(AccountsService), true);
  assert.equal(p0Controllers.includes(AccountsController), true);
});
