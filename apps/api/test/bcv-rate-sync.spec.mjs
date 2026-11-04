import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const { BcvRateSync } = await import('../src/modules/finance/bcv-rate-sync.ts');

const current = new Date('2026-10-12T12:00:00Z');
const previous = new Date('2026-10-01T00:00:00Z');

test('stores dated official average in both directions without duplicating on refresh', async () => {
  const rows = [];
  const urls = [];
  const prisma = { $transaction: async (run) => run(prisma), $queryRaw: async () => [], fxRate: {
    findFirst: async ({ where }) => rows.find((row) => row.baseCode === where.baseCode &&
      row.quoteCode === where.quoteCode && row.effectiveAt.getTime() === where.effectiveAt.getTime()) ?? null,
    create: async ({ data }) => { rows.push(data); return data; },
  } };
  const fetcher = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => url.includes('historicos')
      ? { promedio: 40, fecha: '2026-09-30' }
      : { promedio: 50, fechaActualizacion: '2026-10-12T10:00:00Z' } };
  };
  const sync = new BcvRateSync(prisma);
  await sync.refresh(current, previous, fetcher);
  await sync.refresh(current, previous, fetcher);
  assert.equal(urls.length, 2);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map(({ baseCode, quoteCode, rate, source, effectiveAt }) =>
    [baseCode, quoteCode, rate, source, effectiveAt.toISOString()]).sort(), [
    ['USD', 'VES', '40', 'MARKET', '2026-09-30T00:00:00.000Z'],
    ['VES', 'USD', '0.025000000000', 'MARKET', '2026-09-30T00:00:00.000Z'],
    ['USD', 'VES', '50', 'MARKET', '2026-10-12T10:00:00.000Z'],
    ['VES', 'USD', '0.020000000000', 'MARKET', '2026-10-12T10:00:00.000Z'],
  ].sort());
});

test('invalid or unavailable upstream quotes never create rates', async () => {
  const created = [];
  const prisma = { $transaction: async (run) => run(prisma), $queryRaw: async () => [], fxRate: {
    findFirst: async () => null,
    create: async ({ data }) => { created.push(data); return data; },
  } };
  const sync = new BcvRateSync(prisma);
  await sync.refresh(current, previous, async () => ({ ok: true, json: async () =>
    ({ promedio: 0, fechaActualizacion: current.toISOString() }) }));
  assert.equal(created.length, 0);
});

test('two API instances serialize each published pair before checking for an existing rate', async () => {
  const rows = [];
  let tail = Promise.resolve();
  let locked = 0;
  const prisma = { $transaction: async (run) => {
    const prior = tail;
    let unlock;
    tail = new Promise((resolve) => { unlock = resolve; });
    await prior;
    try { return await run(prisma); } finally { unlock(); }
  }, $queryRaw: async () => { locked++; return []; }, fxRate: {
    findFirst: async ({ where }) => rows.find((row) => row.baseCode === where.baseCode &&
      row.quoteCode === where.quoteCode && row.effectiveAt.getTime() === where.effectiveAt.getTime()) ?? null,
    create: async ({ data }) => { rows.push(data); return data; },
  } };
  const fetcher = async (url) => url.includes('historicos')
    ? { ok: false } : { ok: true, json: async () =>
      ({ promedio: 50, fechaActualizacion: '2026-10-12T10:00:00Z' }) };
  await Promise.all([
    new BcvRateSync(prisma).refresh(current, previous, fetcher),
    new BcvRateSync(prisma).refresh(current, previous, fetcher),
  ]);
  assert.equal(locked, 4);
  assert.equal(rows.length, 2);
});
