import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';
import { Prisma } from '@prisma/client';
const { BudgetsService, RecurringRulesService } = await import('../src/modules/p1.module.ts');

const decimal = (value) => new Prisma.Decimal(value);
function fixture({ baseCurrency = 'USDT', budgetCurrency = baseCurrency, transactions = [] } = {}) {
  const state = { budget: null, audits: [], transactions, latestRate: decimal('1.01'), rateReads: 0 };
  const prisma = {
    category: { findFirst: async ({ where }) => where.id === 'category-1' && where.userId === 'owner' ? { id: 'category-1', userId: 'owner', archivedAt: null } : null },
    account: { findFirst: async () => null },
    userPreferences: { findUnique: async () => ({ timezone: 'America/New_York', baseCurrency }) },
    currency: { upsert: async () => ({}) },
    fxRate: { findFirst: async () => { state.rateReads++; return { rate: state.latestRate }; } },
    budget: {
      findUnique: async ({ where }) => state.budget && where.userId_categoryId_monthKey.userId === 'owner' ? state.budget : null,
      upsert: async ({ create, update }) => {
        state.budget = state.budget
          ? { ...state.budget, ...update }
          : { ...create, id: 'budget-1', currencyCode: budgetCurrency };
        return state.budget;
      },
      findMany: async ({ where }) => state.budget && where.userId === 'owner' ? [state.budget] : [],
      findFirst: async ({ where }) => state.budget && where.userId === 'owner' && where.id === state.budget.id ? state.budget : null,
    },
    transaction: {
      findMany: async ({ where }) => state.transactions.filter((entry) =>
        entry.userId === where.userId && entry.categoryId === where.categoryId &&
        entry.kind === where.kind && entry.voidedAt === null &&
        entry.occurredAt >= where.occurredAt.gte && entry.occurredAt < where.occurredAt.lt),
    },
    auditEvent: { create: async ({ data }) => { state.audits.push(data); } },
  };
  const idem = { replay: async () => undefined, save: async () => undefined };
  return { state, service: new BudgetsService(prisma, idem), rules: new RecurringRulesService(prisma, idem) };
}
const expense = (id, currencyCode, amount, fxSnapshot = null, date = '2026-03-15T12:00:00.000Z') => ({
  id, userId: 'owner', categoryId: 'category-1', kind: 'EXPENSE', currencyCode,
  amount: decimal(amount), fxSnapshot, occurredAt: new Date(date), voidedAt: null,
});
const command = { categoryId: 'category-1', month: '2026-03', limit: '1.000001' };

test('USDT budget retains micro-expenses, missing IDs, immutable snapshots, and signed remaining', async () => {
  const native = expense('native', 'USDT', '0.000002');
  const missing = expense('missing', 'USD', '0.50');
  const { state, service } = fixture({ transactions: [native, missing] });
  const initial = await service.upsert('owner', undefined, command);
  assert.deepEqual([initial.limit, initial.spent, initial.remaining, initial.partial], ['1.000001', '0.000002', '0.999999', true]);
  assert.deepEqual(initial.affectedIds, ['missing']);
  assert.match(initial.warnings.join(' '), /USD\/USDT/);
  missing.fxSnapshot = { baseCurrency: 'USDT', baseAmount: decimal('1.000001') };
  state.latestRate = decimal('9.99');
  const complete = await service.get('owner', 'budget-1');
  assert.deepEqual([complete.spent, complete.remaining, complete.partial], ['1.000003', '-0.000002', false]);
  assert.deepEqual(complete.affectedIds, []);
  assert.equal(state.rateReads, 0, 'budget history never reprices with market rates');
  assert.equal(state.audits.length, 1);
});

test('budget keeps stored currency when user preferences change', async () => {
  const { service, state } = fixture({ baseCurrency: 'USD', budgetCurrency: 'USDT', transactions: [expense('native', 'USDT', '0.000002')] });
  state.budget = { id: 'budget-1', userId: 'owner', categoryId: 'category-1', monthKey: '2026-03', timezone: 'America/New_York', currencyCode: 'USDT', limit: decimal('1.000001') };
  const updated = await service.upsert('owner', undefined, { ...command, limit: '2.000001' });
  assert.equal(state.budget.currencyCode, 'USDT');
  assert.deepEqual([updated.limit, updated.spent, updated.remaining], ['2.000001', '0.000002', '1.999999']);
});

test('budget rejects foreign category, foreign budget and invalid native input without writes', async () => {
  const { service, state } = fixture();
  await assert.rejects(service.upsert('owner', undefined, { ...command, categoryId: 'foreign' }), { code: 'NOT_FOUND' });
  await assert.rejects(service.upsert('owner', undefined, { ...command, limit: 1.25 }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.upsert('owner', undefined, { ...command, limit: '0.0000001' }), { code: 'VALIDATION_ERROR' });
  assert.equal(state.budget, null);
  assert.deepEqual(state.audits, []);
  await assert.rejects(service.get('foreign', 'budget-1'), { code: 'NOT_FOUND' });
});

test('budget month uses timezone, excludes void, other categories and out-of-month rows', async () => {
  const valid = expense('valid', 'USDT', '0.000002', null, '2026-03-01T05:00:00.000Z');
  const outside = expense('outside', 'USDT', '1', null, '2026-03-01T04:59:59.999Z');
  const voided = { ...expense('void', 'USDT', '1'), voidedAt: new Date() };
  const other = { ...expense('other', 'USDT', '1'), categoryId: 'other' };
  const { service } = fixture({ transactions: [valid, outside, voided, other] });
  const result = await service.upsert('owner', undefined, command);
  assert.equal(result.spent, '0.000002');
});

test('foreign recurring account is denied before rule or ledger write', async () => {
  const { rules, state } = fixture();
  await assert.rejects(rules.create('owner', undefined, { accountId: 'foreign', amount: '0.000001', kind: 'EXPENSE', cadence: 'DAILY', timezone: 'UTC', startAt: '2026-03-01T00:00:00Z' }), { code: 'NOT_FOUND' });
  assert.deepEqual(state.audits, []);
  assert.deepEqual(state.transactions, []);
});

test('a stale foreign category lookup cannot create a budget', async () => {
  const { service, state } = fixture();
  const prisma = service.prisma;
  prisma.category.findFirst = async () => ({ id: 'category-1', userId: 'other', archivedAt: null });
  await assert.rejects(service.upsert('owner', undefined, command), { code: 'NOT_FOUND' });
  assert.equal(state.budget, null);
  assert.deepEqual(state.audits, []);
});

test('a stale foreign recurring rule lookup cannot update another user rule', async () => {
  const { rules, state } = fixture();
  const prisma = rules.prisma;
  prisma.recurringRule = {
    findFirst: async () => ({ id: 'rule-1', userId: 'other', active: true }),
    update: async () => { state.audits.push('foreign-rule-updated'); return { id: 'rule-1' }; },
  };
  await assert.rejects(rules.update('owner', 'rule-1', { active: false }), { code: 'NOT_FOUND' });
  assert.deepEqual(state.audits, []);
});

test('a stale foreign budget lookup cannot overwrite its stored limit', async () => {
  const { service, state } = fixture();
  state.budget = { id: 'foreign-budget', userId: 'other', categoryId: 'category-1', monthKey: '2026-03', timezone: 'UTC', currencyCode: 'USD', limit: decimal('10') };
  await assert.rejects(service.upsert('owner', undefined, command), { code: 'NOT_FOUND' });
  assert.equal(state.budget.limit.toFixed(), '10');
  assert.deepEqual(state.audits, []);
});
