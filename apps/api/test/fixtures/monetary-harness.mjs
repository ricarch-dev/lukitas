import assert from 'node:assert/strict';
import { addDecimal } from '../../src/modules/p0-finance.ts';
import { TransfersService, DashboardService } from '../../src/modules/p0-monetary.ts';

const copy = (value) => structuredClone(value);

export const transferHarness = () => {
  let state = {
    accounts: [
      { id: 'source', userId: 'owner', currencyCode: 'USDT', openingBalance: '2.000000', archivedAt: null,
        createdAt: new Date('2026-01-01'), currency: { code: 'USDT', precision: 6 } },
      { id: 'target', userId: 'owner', currencyCode: 'VES', openingBalance: '100.00', archivedAt: null,
        createdAt: new Date('2026-01-02'), currency: { code: 'VES', precision: 2 } },
    ],
    rates: [], transfers: [], transactions: [], ledger: [], snapshots: [], snapshotRates: [],
  };
  const replay = new Map();
  let failure = null;
  let revokedAccount = null;
  let postingCount = 0;
  const row = (rows, data, prefix) => {
    const created = { ...copy(data), id: `${prefix}-${rows.length + 1}` };
    rows.push(created);
    return copy(created);
  };
  const store = (staged) => ({
    account: { findFirst: async ({ where }) => copy(staged.accounts.find((account) =>
      account.id === where.id && account.userId === where.userId) ?? null) },
    transfer: { create: async ({ data }) => row(staged.transfers, data, 'transfer') },
    transaction: { create: async ({ data }) => row(staged.transactions,
      { ...data, voidedAt: null, categoryId: null }, 'transaction') },
    ledgerEntry: {
      create: async ({ data }) => {
        row(staged.ledger, data, 'ledger');
        postingCount++;
        if (failure === 'first-posting' && postingCount === 1) throw new Error('first posting failed');
      },
      createMany: async ({ data }) => {
        for (const entry of data) await store(staged).ledgerEntry.create({ data: entry });
      },
      findMany: async ({ where }) => copy(staged.ledger.filter((entry) => entry.accountId === where.accountId)
        .map(({ signedAmount }) => ({ signedAmount }))),
    },
    fxSnapshot: { create: async ({ data }) => {
      const { rates, ...snapshot } = data;
      const created = row(staged.snapshots, snapshot, 'snapshot');
      if (failure === 'snapshot') throw new Error('snapshot failed');
      row(staged.snapshotRates, { snapshotId: created.id, ...rates.create }, 'snapshot-rate');
      return created;
    } },
  });
  const prisma = {
    account: {
      findFirst: async ({ where }) => copy(state.accounts.find((account) => account.id === where.id && account.userId === where.userId) ?? null),
      findMany: async ({ where }) => copy(state.accounts.filter((account) => account.userId === where.userId && !account.archivedAt)),
    },
    fxRate: { findFirst: async ({ where }) => copy(state.rates.filter((rate) =>
      rate.baseCode === where.baseCode && rate.quoteCode === where.quoteCode &&
      rate.effectiveAt <= where.effectiveAt.lte).sort((a, b) => b.effectiveAt - a.effectiveAt)[0] ?? null) },
    userPreferences: { findUnique: async () => ({ baseCurrency: 'USDT', timezone: 'UTC' }) },
    transaction: { findMany: async ({ where, take }) => copy(state.transactions.filter((transaction) =>
      transaction.userId === where.userId && transaction.occurredAt >= where.occurredAt.gte &&
      transaction.occurredAt <= where.occurredAt.lte).slice(0, take)) },
    ledgerEntry: { findMany: async ({ where }) => store(state).ledgerEntry.findMany({ where }) },
    $transaction: async (run) => {
      const staged = copy(state);
      if (revokedAccount) staged.accounts.find((account) => account.id === revokedAccount).userId = 'another-user';
      postingCount = 0;
      const result = await run(store(staged));
      state = staged;
      return result;
    },
  };
  const idem = {
    replay: async (user, key, body) => key ? copy(replay.get(`${user}:${key}:${JSON.stringify(body)}`)) : undefined,
    save: async (user, key, body, result) => { if (key) replay.set(`${user}:${key}:${JSON.stringify(body)}`, copy(result)); },
  };
  const balance = (id) => {
    const account = state.accounts.find((value) => value.id === id);
    assert.ok(account);
    return state.ledger.filter((entry) => entry.accountId === id)
      .reduce((total, entry) => addDecimal(total, entry.signedAmount), account.openingBalance);
  };
  return {
    get state() { return state; },
    transfers: new TransfersService(prisma, idem), dashboard: new DashboardService(prisma),
    balance, failAt: (step) => { failure = step; },
    revokeBeforePosting: (id) => { revokedAccount = id; },
    get postingCount() { return postingCount; },
  };
};

export const dashboardHarness = (baseCurrency = 'USD') => {
  const state = { accounts: [], ledger: [], transactions: [], rates: [], queries: [] };
  const prisma = {
    userPreferences: { findUnique: async () => ({ baseCurrency, timezone: 'UTC' }) },
    account: { findMany: async ({ where }) => copy(state.accounts.filter((account) =>
      account.userId === where.userId && account.archivedAt === null)) },
    ledgerEntry: { findMany: async ({ where }) => copy(state.ledger.filter((entry) =>
      entry.accountId === where.accountId).map(({ signedAmount }) => ({ signedAmount }))) },
    transaction: { findMany: async ({ where, take }) => {
      state.queries.push(take);
      const rows = state.transactions.filter((transaction) => transaction.userId === where.userId &&
        transaction.voidedAt === null && transaction.occurredAt >= where.occurredAt.gte &&
        transaction.occurredAt <= where.occurredAt.lte).sort((a, b) => b.occurredAt - a.occurredAt);
      return copy(take === undefined ? rows : rows.slice(0, take));
    } },
    fxRate: { findFirst: async ({ where }) => copy(state.rates.filter((rate) =>
      rate.baseCode === where.baseCode && rate.quoteCode === where.quoteCode &&
      rate.effectiveAt <= where.effectiveAt.lte).sort((a, b) => b.effectiveAt - a.effectiveAt)[0] ?? null) },
  };
  return { state, dashboard: new DashboardService(prisma) };
};
