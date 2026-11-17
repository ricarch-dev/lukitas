import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import 'reflect-metadata';
import 'tsx/esm';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';

const { DebtsService, DebtsController } = await import('../src/modules/debts/debts.ts');
const { IdempotencyService } = await import('../src/common/idempotency.ts');
const { AccountsService } = await import('../src/modules/accounts/accounts.ts');
const { ReportsService } = await import('../src/modules/reports/reports.ts');
const { DashboardService } = await import('../src/modules/dashboard/dashboard.ts');
const { AuditService } = await import('../src/modules/audit/audit.ts');
const { AuthGuard } = await import('../src/common/guards/auth.guard.ts');
const { p1Controllers, p1Providers } = await import('../src/modules/p1.module.ts');

test('debt API records and settles principal atomically without treating it as income or expense', async (t) => {
  const url = process.env.DATABASE_URL;
  assert.ok(url?.startsWith('file:'), 'Probe requires an isolated SQLite file');
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  t.after(async () => {
    await prisma.$disconnect();
  });
  const user = await prisma.user.create({
    data: {
      email: 'debts@example.test',
      passwordHash: 'unused',
      preferences: {
        create: { baseCurrency: 'USD', timezone: 'America/Caracas', onboardingComplete: true },
      },
    },
  });
  const other = await prisma.user.create({
    data: { email: 'other@example.test', passwordHash: 'unused' },
  });
  const usd = await prisma.account.create({
    data: { userId: user.id, name: 'Dollars', currencyCode: 'USD', openingBalance: '200.00' },
  });
  const ves = await prisma.account.create({
    data: { userId: user.id, name: 'Bolivars', currencyCode: 'VES', openingBalance: '10000.00' },
  });
  const foreign = await prisma.account.create({
    data: { userId: other.id, name: 'Private', currencyCode: 'USD', openingBalance: '50.00' },
  });
  const idem = new IdempotencyService(prisma);
  const service = new DebtsService(prisma, idem);
  const controller = new DebtsController(service);
  const req = { user: { sub: user.id } };
  const accounts = new AccountsService(prisma, idem);
  const input = {
    direction: 'RECEIVABLE',
    counterparty: 'Ana',
    concept: 'Préstamo',
    principal: '100.00',
    currencyCode: 'USD',
    occurredAt: '2026-11-01T12:00:00Z',
    dueDate: '2026-11-10',
  };

  const old = await controller.create(req, 'old-debt', input);
  assert.equal(old.outstanding, '100.00');
  assert.equal(old.status, 'OVERDUE');
  assert.equal((await accounts.list(user.id))[0].balance, '200.00');
  assert.equal(await prisma.transaction.count(), 0);
  assert.equal((await controller.create(req, 'old-debt', input)).id, old.id);
  await assert.rejects(controller.create(req, 'old-debt', { ...input, principal: '101.00' }), {
    code: 'IDEMPOTENCY_CONFLICT',
  });

  const current = await controller.create(req, 'new-loan', {
    ...input,
    cash: { accountId: usd.id, amount: '100.00' },
  });
  assert.equal((await accounts.list(user.id))[0].balance, '100.00');
  const payment = {
    accountId: ves.id,
    amount: '2000.00',
    rate: '0.025',
    occurredAt: '2026-11-05T12:00:00Z',
  };
  const paid = await controller.pay(req, current.id, 'payment-1', payment);
  assert.equal(paid.outstanding, '50.00');
  assert.equal(paid.events.at(-1).debtAmount, '50.00');
  assert.equal(paid.events.at(-1).rate, '0.025');
  assert.equal((await accounts.list(user.id))[1].balance, '12000.00');
  assert.equal((await controller.pay(req, current.id, 'payment-1', payment)).outstanding, '50.00');
  assert.equal(await prisma.debtEvent.count({ where: { debtId: current.id } }), 2);
  const beforeInvalid = await prisma.ledgerEntry.count();
  await assert.rejects(
    controller.pay(req, current.id, 'too-much', { ...payment, amount: '3000.00' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    controller.pay(req, current.id, 'no-rate', { ...payment, rate: undefined }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    controller.pay(req, current.id, 'tiny', { ...payment, amount: '0.01', rate: '0.001' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    controller.pay(req, current.id, 'foreign', {
      accountId: foreign.id,
      amount: '1.00',
      occurredAt: payment.occurredAt,
    }),
    { code: 'NOT_FOUND' },
  );
  await assert.rejects(
    controller.pay({ user: { sub: other.id } }, current.id, 'intrusion', payment),
    { code: 'NOT_FOUND' },
  );
  assert.equal(await prisma.ledgerEntry.count(), beforeInvalid);
  assert.equal((await service.get(user.id, current.id)).outstanding, '50.00');

  const complete = await controller.pay(req, current.id, 'payment-2', {
    accountId: usd.id,
    amount: '50.00',
    occurredAt: '2026-11-06T12:00:00Z',
  });
  assert.equal(complete.status, 'SETTLED');
  assert.equal(complete.outstanding, '0.00');
  const databaseHash = () =>
    createHash('sha256')
      .update(readFileSync(url.slice(5)))
      .digest('hex');
  async function rejectsWithoutChangingDatabase(run, code, message, status) {
    const before = databaseHash();
    await assert.rejects(run, (error) => {
      assert.equal(error.code, code);
      assert.equal(error.message, message);
      assert.equal(error.getStatus(), status);
      return true;
    });
    assert.equal(databaseHash(), before);
  }
  await rejectsWithoutChangingDatabase(
    () =>
      service.pay(user.id, current.id, 'settled-overpayment-invariant', {
        accountId: usd.id,
        amount: '0.01',
        occurredAt: payment.occurredAt,
      }),
    'VALIDATION_ERROR',
    'Payments exceed outstanding principal',
    422,
  );
  const settledPayment = await prisma.debtEvent.findFirstOrThrow({
    where: { debtId: current.id, kind: 'PAYMENT' },
  });
  await rejectsWithoutChangingDatabase(
    () =>
      new AuditService(prisma, idem).void(
        user.id,
        settledPayment.transactionId,
        'principal-void-invariant',
        { reason: 'Independent probe' },
      ),
    'CONFLICT',
    'Debt principal events cannot be voided independently',
    409,
  );
  const payable = await controller.create(req, 'borrow', {
    ...input,
    direction: 'PAYABLE',
    principal: '20.00',
    cash: { accountId: usd.id, amount: '20.00' },
  });
  await controller.pay(req, payable.id, 'repay', {
    accountId: usd.id,
    amount: '5.00',
    occurredAt: payment.occurredAt,
  });
  assert.equal((await accounts.list(user.id))[0].balance, '165.00');
  const overview = await controller.list(req);
  assert.deepEqual(overview.totals, [
    { currencyCode: 'USD', payable: '15.00', receivable: '100.00' },
  ]);
  assert.equal((await controller.list({ user: { sub: other.id } })).items.length, 0);
  const reports = new ReportsService(prisma);
  const range = { from: '2026-11-01T00:00:00Z', to: '2026-12-01T00:00:00Z' };
  assert.deepEqual((await reports.get(user.id, range)).items, []);
  assert.deepEqual((await reports.search(user.id, {})).items, []);
  const dashboard = await new DashboardService(prisma, { refresh: async () => {} }).get(
    user.id,
    range.from,
    range.to,
    new Date('2026-11-16T12:00:00Z'),
  );
  assert.equal(dashboard.flow.income, '0.00');
  assert.equal(dashboard.flow.expense, '0.00');
  const principal = await prisma.transaction.findFirstOrThrow({ where: { userId: user.id } });
  await assert.rejects(
    new AuditService(prisma, idem).void(user.id, principal.id, 'void-principal', {
      reason: 'unsafe',
    }),
    { code: 'CONFLICT' },
  );
  assert.equal((await service.get(user.id, current.id)).outstanding, '0.00');
  await accounts.transaction(user.id, usd.id, 'ordinary-income', {
    kind: 'INCOME',
    amount: '10.00',
    occurredAt: payment.occurredAt,
  });
  assert.equal((await reports.get(user.id, range)).baseTotal, '10');
  assert.equal((await reports.search(user.id, {})).items.length, 1);

  const contested = { accountId: usd.id, amount: '60.00', occurredAt: payment.occurredAt };
  const peer = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  try {
    const competing = new DebtsService(peer, new IdempotencyService(peer));
    const attempts = await Promise.allSettled([
      controller.pay(req, old.id, 'concurrent-a', contested),
      competing.pay(user.id, old.id, 'concurrent-b', contested),
    ]);
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = attempts.find((result) => result.status === 'rejected');
    assert.ok(rejected);
    assert.ok(['VALIDATION_ERROR', 'CONFLICT'].includes(rejected.reason.code));
  } finally {
    await peer.$disconnect();
  }
  assert.equal((await service.get(user.id, old.id)).outstanding, '40.00');
  assert.equal(await prisma.debtEvent.count({ where: { debtId: old.id, kind: 'PAYMENT' } }), 1);
  const finalPeer = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  try {
    const competing = new DebtsService(finalPeer, new IdempotencyService(finalPeer));
    const complete = { ...contested, amount: '40.00' };
    const responses = await Promise.allSettled([
      service.pay(user.id, old.id, 'shared-final-payment', complete),
      competing.pay(user.id, old.id, 'shared-final-payment', complete),
    ]);
    const winner = responses.find((result) => result.status === 'fulfilled');
    assert.ok(winner);
    assert.equal(winner.value.status, 'SETTLED');
    for (const response of responses)
      if (response.status === 'rejected') assert.equal(response.reason.code, 'CONFLICT');
    const replay = await service.pay(user.id, old.id, 'shared-final-payment', complete);
    assert.deepEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(winner.value)));
    assert.equal(await prisma.debtEvent.count({ where: { debtId: old.id, kind: 'PAYMENT' } }), 2);
  } finally {
    await finalPeer.$disconnect();
  }
  const beforeRetry = await prisma.transaction.count();
  const duplicateInput = { ...input, concept: 'Retry safe' };
  const duplicates = await Promise.allSettled([
    controller.create(req, 'concurrent-create', duplicateInput),
    controller.create(req, 'concurrent-create', duplicateInput),
  ]);
  assert.ok(duplicates.some((result) => result.status === 'fulfilled'));
  assert.equal(await prisma.debt.count({ where: { concept: 'Retry safe' } }), 1);
  assert.equal(await prisma.transaction.count(), beforeRetry);
  await assert.rejects(
    controller.create(req, 'invalid-date', { ...input, dueDate: '2026-02-30' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    controller.pay(req, old.id, 'early', { ...contested, occurredAt: '2026-10-01T12:00:00Z' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    controller.create(req, 'wrong-principal', {
      ...input,
      cash: { accountId: usd.id, amount: '1.00' },
    }),
    { code: 'VALIDATION_ERROR' },
  );
  assert.equal(await prisma.transaction.count(), beforeRetry);

  assert.ok(p1Controllers.includes(DebtsController));
  assert.ok(p1Providers.includes(DebtsService));
  assert.equal(Reflect.getMetadata(PATH_METADATA, DebtsController), 'debts');
  assert.ok(Reflect.getMetadata(GUARDS_METADATA, DebtsController).includes(AuthGuard));
});
