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
  assert.equal(
    validatedMonthBounds('2026-12', 'UTC').to.toISOString(),
    '2027-01-01T00:00:00.000Z',
  );
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
  assert.equal(
    transactionQuery.where.occurredAt.gte.toISOString(),
    '2026-03-01T05:00:00.000Z',
  );
  assert.equal(transactionQuery.where.occurredAt.lt.toISOString(), '2026-04-01T04:00:00.000Z');
});
