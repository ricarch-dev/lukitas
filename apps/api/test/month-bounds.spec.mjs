import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const [{ AppError }, { ReportsService, validatedMonthBounds }] = await Promise.all([
  import('../src/common/errors.ts'),
  import('../src/modules/p1.module.ts'),
]);

test('API monthly ranges reuse domain UTC, DST, and rollover semantics', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(validatedMonthBounds('2026-02', 'UTC')).map(([key, value]) => [
        key,
        value.toISOString(),
      ]),
    ),
    { from: '2026-02-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' },
  );
  assert.equal(
    validatedMonthBounds('2026-03', 'America/New_York').to.toISOString(),
    '2026-04-01T04:00:00.000Z',
  );
  assert.equal(validatedMonthBounds('2026-12', 'UTC').to.toISOString(), '2027-01-01T00:00:00.000Z');
});

test('API monthly ranges translate domain RangeError values into validation errors', () => {
  for (const [month, timezone] of [
    ['2026-13', 'UTC'],
    ['2026-03', 'Mars/Olympus'],
  ]) {
    assert.throws(
      () => validatedMonthBounds(month, timezone),
      (error) =>
        error instanceof AppError && error.code === 'VALIDATION_ERROR' && error.getStatus() === 422,
    );
  }
});

test('monthly reports query the canonical half-open range', async () => {
  let transactionQuery;
  const prisma = {
    userPreferences: {
      findUnique: async () => ({ baseCurrency: 'USD', timezone: 'America/New_York' }),
    },
    transaction: {
      findMany: async (query) => {
        transactionQuery = query;
        return [];
      },
    },
  };
  const report = await new ReportsService(prisma).get('user-1', { month: '2026-03' });

  assert.equal(report.from, '2026-03-01T05:00:00.000Z');
  assert.equal(report.to, '2026-04-01T04:00:00.000Z');
  assert.equal(transactionQuery.where.occurredAt.gte.toISOString(), '2026-03-01T05:00:00.000Z');
  assert.equal(transactionQuery.where.occurredAt.lt.toISOString(), '2026-04-01T04:00:00.000Z');
});

test('monthly report exposes note and transfer identity for movement search without changing its totals', async () => {
  const prisma = {
    userPreferences: { findUnique: async () => ({ baseCurrency: 'USD', timezone: 'UTC' }) },
    transaction: {
      findMany: async () => [
        {
          id: 'movement-1',
          accountId: 'account-1',
          categoryId: null,
          kind: 'EXPENSE',
          amount: '12.00',
          currencyCode: 'USD',
          occurredAt: new Date('2026-10-05T12:00:00Z'),
          note: 'Café',
          transferId: 'transfer-1',
          fxSnapshot: null,
        },
      ],
    },
  };
  const report = await new ReportsService(prisma).get('user-1', { month: '2026-10' });
  assert.equal(report.items[0].note, 'Café');
  assert.equal(report.items[0].transferId, 'transfer-1');
  assert.equal(report.baseTotal, '-12');
});

test('global movement search is user-scoped and paginated without truncating monthly reports', async () => {
  let queried;
  const prisma = {
    transaction: {
      findMany: async (query) => {
        queried = query;
        return [];
      },
    },
  };
  const result = await new ReportsService(prisma).search('user-1', {
    search: 'Coffee',
    skip: '100',
  });
  assert.deepEqual(result, { items: [], hasMore: false });
  assert.equal(queried.where.userId, 'user-1');
  assert.equal(queried.where.voidedAt, null);
  assert.equal(
    queried.where.OR.some((predicate) => predicate.note?.contains === 'Coffee'),
    true,
  );
  assert.equal(queried.take, 101);
  assert.equal(queried.skip, 100);
});

test('global kind and category filters apply before pagination', async () => {
  let queried;
  const prisma = {
    transaction: {
      findMany: async (query) => {
        queried = query;
        return [];
      },
    },
  };
  await new ReportsService(prisma).search('user-1', { kind: 'EXPENSE', categoryId: 'food' });
  assert.equal(queried.where.kind, 'EXPENSE');
  assert.equal(queried.where.categoryId, 'food');
});

test('global search finds amounts as well as notes across months', async () => {
  let queried;
  const prisma = {
    transaction: {
      findMany: async (query) => {
        queried = query;
        return [];
      },
    },
  };
  await new ReportsService(prisma).search('user-1', { search: '10.50' });
  assert.equal(
    queried.where.OR.some((predicate) => predicate.amount === '10.50'),
    true,
  );
  assert.equal(
    queried.where.OR.some((predicate) => predicate.note?.contains === '10.50'),
    true,
  );
});
