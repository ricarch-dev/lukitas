import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import 'tsx/esm';

const { ReportsService } = await import('../src/modules/reports/reports.ts');

const url = process.env.DATABASE_URL;
assert.ok(url?.startsWith('file:'), 'Only a disposable SQLite file can be used by this probe');
const amount = '999999999999.99999999';
const rate = '0.000000000001';
const first = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
let accountId;
let entryId;
let rateId;
let userId;
try {
  const user = await first.user.create({
    data: {
      email: 'local@example.test',
      passwordHash: 'test-only',
      accounts: { create: { name: 'Local', currencyCode: 'USD', openingBalance: amount } },
    },
    include: { accounts: true },
  });
  accountId = user.accounts[0].id;
  userId = user.id;
  const transaction = await first.transaction.create({
    data: {
      userId: user.id,
      accountId,
      kind: 'INCOME',
      amount,
      currencyCode: 'USD',
      occurredAt: new Date('2026-11-12T12:00:00Z'),
    },
  });
  entryId = (
    await first.ledgerEntry.create({
      data: { transactionId: transaction.id, accountId, signedAmount: `-${amount}` },
    })
  ).id;
  rateId = (
    await first.fxRate.create({
      data: {
        baseCode: 'USD',
        quoteCode: 'VES',
        effectiveAt: new Date('2026-11-12T12:00:00Z'),
        source: 'MANUAL',
        rate,
      },
    })
  ).id;
  await first.transaction.create({
    data: {
      userId,
      accountId,
      kind: 'INCOME',
      amount: '12.00',
      currencyCode: 'USD',
      note: 'Café',
      occurredAt: new Date('2026-11-12T13:00:00Z'),
    },
  });
} finally {
  await first.$disconnect();
}

const second = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
try {
  assert.equal(
    (await second.account.findUniqueOrThrow({ where: { id: accountId } })).openingBalance,
    amount,
  );
  assert.equal(
    (await second.ledgerEntry.findUniqueOrThrow({ where: { id: entryId } })).signedAmount,
    `-${amount}`,
  );
  assert.equal((await second.fxRate.findUniqueOrThrow({ where: { id: rateId } })).rate, rate);
  const databaseHash = () =>
    createHash('sha256')
      .update(readFileSync(url.slice(5)))
      .digest('hex');
  const beforeRejectedWrite = databaseHash();
  await assert.rejects(
    second.fxRate.create({
      data: {
        baseCode: 'USD',
        quoteCode: 'VES',
        effectiveAt: new Date('2026-11-12T12:00:00Z'),
        source: 'MANUAL',
        rate: '1',
      },
    }),
    { code: 'P2002' },
  );
  assert.equal(databaseHash(), beforeRejectedWrite);
  assert.deepEqual(
    (await second.currency.findMany({ select: { code: true }, orderBy: { code: 'asc' } })).map(
      ({ code }) => code,
    ),
    ['EUR', 'GBP', 'USD', 'USDT', 'VES'],
  );
  const reports = new ReportsService(second);
  assert.equal((await reports.search(userId, { search: '12' })).items[0]?.amount, '12.00');
  assert.equal((await reports.search(userId, { search: 'CAFÉ' })).items[0]?.note, 'Café');
  assert.equal((await reports.search(userId, { search: 'usd' })).items.length, 2);
  console.log('Exact SQLite monetary values survived reconnection');
} finally {
  await second.$disconnect();
}
