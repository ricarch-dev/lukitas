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

test('account creation accepts equivalent decimal zeros and returns currency precision', async (t) => {
  for (const openingBalance of ['0', '0.0', '0.00']) {
    await t.test(openingBalance, async () => {
      const harness = createHarness();
      const result = await harness.service.create('user-1', undefined, accountInput(openingBalance));

      assert.deepEqual(harness.persistedOpeningBalances, ['0']);
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

  assert.deepEqual(harness.persistedOpeningBalances, ['0']);
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

test('P0 module wiring retains the extracted account feature', () => {
  assert.equal(p0Providers.includes(AccountsService), true);
  assert.equal(p0Controllers.includes(AccountsController), true);
});
