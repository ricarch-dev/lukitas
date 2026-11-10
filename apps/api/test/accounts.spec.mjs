import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const [
  { AppError },
  { IdempotencyService },
  { AccountsController, AccountsService },
  { p0Controllers, p0Providers },
] = await Promise.all([
  import('../src/common/errors.ts'),
  import('../src/common/idempotency.ts'),
  import('../src/modules/accounts/accounts.ts'),
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
    $transaction: async (run) => run(prisma),
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
  const state = {
    accounts: [],
    bankGroups: [],
    transactions: [],
    ledger: [],
    snapshots: [],
    currencies: [],
    idempotencyKeys: [],
  };
  const copy = (value) => structuredClone(value);
  const account = {
    create: async ({ data }) => {
      const row = {
        ...data,
        id: `account-${state.accounts.length + 1}`,
        archivedAt: null,
        bankGroup: state.bankGroups.find((group) => group.id === data.bankGroupId) ?? null,
        currency: { code: data.currencyCode, precision: data.currencyCode === 'USDT' ? 6 : 2 },
      };
      state.accounts.push(copy(row));
      return copy(row);
    },
    findFirst: async ({ where }) =>
      copy(
        state.accounts.find((row) => row.id === where.id && row.userId === where.userId) ?? null,
      ),
    findMany: async ({ where }) =>
      copy(
        state.accounts.filter(
          (row) => row.userId === where.userId && (!where.archivedAt || !row.archivedAt),
        ),
      ),
  };
  let lastTransaction = Promise.resolve();
  const prisma = {
    currency: {
      upsert: async ({ create }) => {
        state.currencies.push(copy(create));
        return create;
      },
    },
    account,
    bankGroup: {
      findFirst: async ({ where }) =>
        copy(
          state.bankGroups?.find((row) => row.id === where.id && row.userId === where.userId) ??
            null,
        ),
      upsert: async ({ where, create }) => {
        state.bankGroups ??= [];
        let group = state.bankGroups.find(
          (row) =>
            row.userId === where.userId_normalizedName.userId &&
            row.normalizedName === where.userId_normalizedName.normalizedName,
        );
        if (!group) {
          group = {
            ...create,
            id: `00000000-0000-4000-8000-${String(state.bankGroups.length + 1).padStart(12, '0')}`,
          };
          state.bankGroups.push(group);
        }
        return copy(group);
      },
    },
    category: {
      findFirst: async ({ where }) =>
        where.id === 'own' && where.userId === 'user-1' ? { id: 'own' } : null,
    },
    fxRate: { findFirst: async () => null },
    ledgerEntry: {
      findMany: async ({ where }) =>
        copy(
          state.ledger
            .filter((row) => row.accountId === where.accountId)
            .map((row) => ({ signedAmount: row.signedAmount })),
        ),
    },
    idempotencyKey: {
      findUnique: async ({ where }) =>
        copy(
          state.idempotencyKeys.find(
            (row) => row.userId === where.userId_key.userId && row.key === where.userId_key.key,
          ) ?? null,
        ),
      create: async ({ data }) => {
        if (
          state.idempotencyKeys.some((row) => row.userId === data.userId && row.key === data.key)
        ) {
          const error = new Error('Unique constraint failed on owner/key');
          error.code = 'P2002';
          throw error;
        }
        state.idempotencyKeys.push(copy(data));
      },
    },
    $transaction: (run) => {
      // Serialize committed writes while allowing concurrent preflight reads.
      const transaction = lastTransaction
        .catch(() => {})
        .then(async () => {
          const before = copy(state);
          try {
            return await run({
              account: { findFirst: account.findFirst, create: account.create },
              bankGroup: prisma.bankGroup,
              idempotencyKey: prisma.idempotencyKey,
              category: { findFirst: prisma.category.findFirst },
              transaction: {
                create: async ({ data }) => {
                  const row = {
                    ...data,
                    id: `transaction-${state.transactions.length + 1}`,
                    note: data.note ?? null,
                    categoryId: data.categoryId ?? null,
                    voidedAt: null,
                  };
                  state.transactions.push(copy(row));
                  return copy(row);
                },
              },
              ledgerEntry: {
                create: async ({ data }) => {
                  state.ledger.push(copy(data));
                },
              },
              transactionFxSnapshot: {
                create: async ({ data }) => {
                  state.snapshots.push(copy(data));
                },
              },
            });
          } catch (error) {
            Object.assign(state, before);
            throw error;
          }
        });
      lastTransaction = transaction;
      return transaction;
    },
  };
  const service = new AccountsService(prisma, new IdempotencyService(prisma));
  return { state, prisma, service, reload: (userId = 'user-1') => service.list(userId) };
};

test('USDT account and native postings retain six decimals after reload with no FX', async () => {
  const { state, service, reload } = createPostingHarness();
  const created = await service.create('user-1', undefined, {
    name: 'USDT',
    currencyCode: 'USDT',
    openingBalance: '1.23456700',
  });
  assert.equal(created.openingBalance, '1.234567');
  for (const [kind, amount] of [
    ['INCOME', '0.000002'],
    ['EXPENSE', '0.000001'],
  ]) {
    const result = await service.transaction('user-1', created.id, undefined, {
      kind,
      amount,
      currencyCode: 'USDT',
    });
    assert.equal(result.amount, amount);
  }
  assert.deepEqual(
    state.transactions.map((row) => row.amount),
    ['0.000002', '0.000001'],
  );
  assert.deepEqual(
    state.ledger.map((row) => row.signedAmount),
    ['0.000002', '-0.000001'],
  );
  assert.equal((await reload())[0].balance, '1.234568');
  assert.deepEqual(state.snapshots, []);
  const fiat = await service.create('user-1', undefined, accountInput('1.20'));
  assert.equal((await reload()).find((row) => row.id === fiat.id).balance, '1.20');
});

test('owned bank groups persist separate VES and USD accounts across reloads', async () => {
  const { state, service, reload } = createPostingHarness();
  const ves = await service.create('user-1', 'ves-request', {
    name: 'Corriente',
    currencyCode: 'VES',
    openingBalance: '12.50',
    bankName: 'Banco Ejemplo',
  });
  const usd = await service.create('user-1', 'usd-request', {
    name: 'Divisas',
    currencyCode: 'USD',
    openingBalance: '3.25',
    bankGroupId: ves.bankGroup.id,
  });
  assert.notEqual(ves.id, usd.id);
  assert.equal(ves.bankGroup.id, usd.bankGroup.id);
  assert.deepEqual(ves.bankGroup, {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Banco Ejemplo',
  });
  assert.deepEqual(
    (await reload()).map((row) => [row.name, row.balance, row.bankGroup?.name]),
    [
      ['Corriente', '12.50', 'Banco Ejemplo'],
      ['Divisas', '3.25', 'Banco Ejemplo'],
    ],
  );
  assert.equal((await reload('user-2')).length, 0);
  const before = state.accounts.length;
  await assert.rejects(
    service.create('user-2', 'foreign-bank', {
      name: 'Foreign',
      currencyCode: 'USD',
      openingBalance: '1',
      bankGroupId: ves.bankGroup.id,
    }),
    (error) => error instanceof AppError && error.code === 'NOT_FOUND',
  );
  assert.equal(state.accounts.length, before);
  assert.equal(state.bankGroups.length, 1);
  await service.create('user-1', 'another-ves', {
    name: 'Ahorros',
    currencyCode: 'VES',
    openingBalance: '0',
    bankName: 'banco ejemplo',
  });
  assert.equal(state.bankGroups.length, 1);
});

test('bank input rejects ambiguous, malformed and foreign associations before account creation', async () => {
  const { state, service } = createPostingHarness();
  for (const fields of [
    { bankName: '  ' },
    { bankName: 12 },
    { bankGroupId: null },
    { bankGroupId: 'invalid' },
    { bankName: 'Bank', bankGroupId: 'other' },
  ]) {
    await assert.rejects(
      service.create('user-1', undefined, { ...accountInput('0'), ...fields }),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
    );
  }
  assert.deepEqual(state.accounts, []);
  assert.deepEqual(state.bankGroups, []);
});

test('bank account creation replays the same idempotency key without duplicating a ledger', async () => {
  const harness = createPostingHarness();
  const service = new AccountsService(harness.prisma, new IdempotencyService(harness.prisma));
  const body = {
    name: 'Dólares',
    currencyCode: 'USD',
    openingBalance: '10.25',
    bankName: 'Banco Ejemplo',
  };
  const first = await service.create('user-1', 'request-1', body);
  assert.deepEqual(await service.create('user-1', 'request-1', body), first);
  assert.equal(harness.state.accounts.length, 1);
  assert.equal(harness.state.bankGroups.length, 1);
  await assert.rejects(
    service.create('user-1', 'request-1', { ...body, openingBalance: '11' }),
    (error) => error instanceof AppError && error.code === 'IDEMPOTENCY_CONFLICT',
  );
});

const createConcurrentAccountHarness = () => {
  const { state, prisma, reload } = createPostingHarness();
  const originalFind = prisma.idempotencyKey.findUnique;
  let arrived = 0;
  let release;
  const bothRead = new Promise((resolve) => {
    release = resolve;
  });
  prisma.idempotencyKey.findUnique = async (args) => {
    const row = await originalFind(args);
    if (++arrived <= 2) {
      if (arrived === 2) release();
      await bothRead;
    }
    return row;
  };
  const service = new AccountsService(prisma, new IdempotencyService(prisma));
  return { state, prisma, reload, service };
};

test('concurrent same-key creation commits one account and replays its exact response', async () => {
  const { state, reload, service } = createConcurrentAccountHarness();
  const body = {
    name: 'Divisas',
    currencyCode: 'USD',
    openingBalance: '10.25',
    bankName: 'Banco Ejemplo',
  };
  const [first, second] = await Promise.all([
    service.create('user-1', 'same-key', body),
    service.create('user-1', 'same-key', body),
  ]);
  assert.deepEqual(first, second);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.idempotencyKeys.length, 1);
  assert.deepEqual(state.idempotencyKeys[0].response, first);
  assert.equal((await reload())[0].id, first.id);
  await assert.rejects(
    service.create('user-1', 'same-key', { ...body, openingBalance: '11' }),
    (error) => error instanceof AppError && error.code === 'IDEMPOTENCY_CONFLICT',
  );
  const otherOwner = await service.create('user-2', 'same-key', body);
  assert.notEqual(otherOwner.id, first.id);
  assert.notEqual(otherOwner.bankGroup.id, first.bankGroup.id);
  assert.equal(state.accounts.length, 2);
  assert.equal(state.idempotencyKeys.length, 2);
});

test('concurrent different payloads under the same owner/key conflict without an orphan account', async () => {
  const { state, service } = createConcurrentAccountHarness();
  const body = { name: 'Cash', currencyCode: 'USD', openingBalance: '1.00' };
  const outcomes = await Promise.allSettled([
    service.create('user-1', 'shared-key', body),
    service.create('user-1', 'shared-key', { ...body, openingBalance: '2.00' }),
  ]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = outcomes.find((result) => result.status === 'rejected');
  assert.ok(rejected.reason instanceof AppError);
  assert.equal(rejected.reason.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(state.accounts.length, 1);
  assert.equal(state.idempotencyKeys.length, 1);
  assert.equal(state.accounts[0].id, state.idempotencyKeys[0].response.id);
});

test('failed idempotency write rolls back account and bank; no-key calls create distinct accounts', async () => {
  const { state, prisma } = createPostingHarness();
  const service = new AccountsService(prisma, new IdempotencyService(prisma));
  const body = { name: 'Cash', currencyCode: 'USD', openingBalance: '0', bankName: 'Example Bank' };
  const originalCreate = prisma.idempotencyKey.create;
  prisma.idempotencyKey.create = async () => {
    throw new Error('idempotency write failed');
  };
  await assert.rejects(service.create('user-1', 'failing-key', body), /idempotency write failed/);
  assert.deepEqual(state.accounts, []);
  assert.deepEqual(state.bankGroups, []);
  prisma.idempotencyKey.create = originalCreate;
  const [first, second] = await Promise.all([
    service.create('user-1', undefined, body),
    service.create('user-1', undefined, body),
  ]);
  assert.notEqual(first.id, second.id);
  assert.equal(state.accounts.length, 2);
  assert.equal(state.idempotencyKeys.length, 0);
});

test('a bank-name unique race retries without leaving an unrecorded account', async () => {
  const { state, prisma } = createPostingHarness();
  const service = new AccountsService(prisma, new IdempotencyService(prisma));
  const upsert = prisma.bankGroup.upsert;
  let raced = false;
  prisma.bankGroup.upsert = async (args) => {
    if (!raced) {
      raced = true;
      const error = new Error('Bank name was created concurrently');
      error.code = 'P2002';
      throw error;
    }
    return upsert(args);
  };
  const result = await service.create('user-1', 'bank-race', {
    name: 'Savings',
    currencyCode: 'VES',
    openingBalance: '1',
    bankName: 'Example Bank',
  });
  assert.equal(raced, true);
  assert.equal(state.accounts.length, 1);
  assert.equal(state.bankGroups.length, 1);
  assert.deepEqual(state.idempotencyKeys[0].response, result);
});

test('invalid and foreign account requests cause no financial writes', async () => {
  const { state, service, reload } = createPostingHarness();
  for (const currencyCode of [1, null, ['USDT'], { code: 'USDT' }, 'usdt', 'ABCD']) {
    await assert.rejects(
      service.create('user-1', undefined, { name: 'Bad', currencyCode, openingBalance: '1.00' }),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
    );
  }
  for (const openingBalance of [1.25, '0.0000001', '1000000000000']) {
    await assert.rejects(
      service.create('user-1', undefined, { name: 'Bad', currencyCode: 'USDT', openingBalance }),
      (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
    );
  }
  assert.deepEqual(state.accounts, []);
  const created = await service.create('user-1', undefined, {
    name: 'USDT',
    currencyCode: 'USDT',
    openingBalance: '1.000000',
  });
  const financial = () => copyFinancial(state);
  const before = financial();
  const cases = [
    [
      'user-2',
      created.id,
      { kind: 'INCOME', amount: '0.000001', currencyCode: 'USDT' },
      'NOT_FOUND',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: 1.25, currencyCode: 'USDT' },
      'VALIDATION_ERROR',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '0.0000001', currencyCode: 'USDT' },
      'VALIDATION_ERROR',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '1.00', currencyCode: 'ABCD' },
      'VALIDATION_ERROR',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '1.00', currencyCode: null },
      'VALIDATION_ERROR',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '1.00', currencyCode: ['USDT'] },
      'VALIDATION_ERROR',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '1.00', currencyCode: 'USD' },
      'CURRENCY_MISMATCH',
    ],
    [
      'user-1',
      created.id,
      { kind: 'INCOME', amount: '1.00', currencyCode: 'USD', categoryId: 'foreign' },
      'NOT_FOUND',
    ],
  ];
  for (const [user, id, body, errorCode] of cases) {
    await assert.rejects(
      service.transaction(user, id, undefined, body),
      (error) => error instanceof AppError && error.code === errorCode,
    );
    assert.deepEqual(financial(), before);
    assert.equal((await reload())[0].balance, '1.000000');
  }
  state.accounts[0].archivedAt = new Date();
  const archived = financial();
  await assert.rejects(
    service.transaction('user-1', created.id, undefined, {
      kind: 'INCOME',
      amount: '0.000001',
      currencyCode: 'USDT',
    }),
    (error) => error instanceof AppError && error.code === 'ACCOUNT_ARCHIVED',
  );
  assert.deepEqual(financial(), archived);
});

const copyFinancial = (state) => structuredClone(state);

test('account creation accepts equivalent decimal zeros and returns currency precision', async (t) => {
  for (const openingBalance of ['0', '0.0', '0.00']) {
    await t.test(openingBalance, async () => {
      const harness = createHarness();
      const result = await harness.service.create(
        'user-1',
        undefined,
        accountInput(openingBalance),
      );

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
  const row = {
    id: 'shared',
    userId: 'owner',
    name: 'Cash',
    archivedAt: null,
    openingBalance: '0.00',
    currency: { code: 'USD', precision: 2 },
  };
  const prisma = {
    account: {
      findFirst: async ({ where }) =>
        where.id === row.id && where.userId === row.userId ? { ...row } : null,
      update: async ({ where, data }) => {
        if (where.userId !== row.userId) throw new AppError('NOT_FOUND', 'Account not found', 404);
        Object.assign(row, data);
        return { ...row };
      },
    },
    ledgerEntry: { findMany: async () => [] },
  };
  const service = new AccountsService(prisma, {
    replay: async () => undefined,
    save: async () => undefined,
  });
  assert.equal((await service.update('owner', 'shared', { name: 'Savings' })).name, 'Savings');
  assert.equal((await service.archive('owner', 'shared', undefined)).archived, true);
  assert.equal(row.name, 'Savings');
  assert.ok(row.archivedAt);
});

test('P0 module wiring retains the extracted account feature', () => {
  assert.equal(p0Providers.includes(AccountsService), true);
  assert.equal(p0Controllers.includes(AccountsController), true);
});
