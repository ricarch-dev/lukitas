import test from 'node:test';
import assert from 'node:assert/strict';
import 'tsx/esm';

const { BcvRateSync } = await import('../src/modules/finance/bcv-rate-sync.ts');

const current = new Date('2026-10-12T12:00:00Z');
const previous = new Date('2026-10-01T00:00:00Z');

test('stores dated official average in both directions without duplicating on refresh', async () => {
  const rows = [];
  const urls = [];
  const prisma = {
    fxRate: {
      upsert: async ({ where, create }) => {
        const key = where.baseCode_quoteCode_effectiveAt;
        const existing = rows.find(
          (row) =>
            row.baseCode === key.baseCode &&
            row.quoteCode === key.quoteCode &&
            row.effectiveAt.getTime() === key.effectiveAt.getTime(),
        );
        if (existing) return existing;
        rows.push(create);
        return create;
      },
    },
  };
  const fetcher = async (url) => {
    urls.push(url);
    return {
      ok: true,
      json: async () =>
        url.includes('historicos')
          ? { promedio: 40, fecha: '2026-09-30' }
          : { promedio: 50, fechaActualizacion: '2026-10-12T10:00:00Z' },
    };
  };
  const sync = new BcvRateSync(prisma);
  await sync.refresh(current, previous, fetcher);
  await sync.refresh(current, previous, fetcher);
  assert.equal(urls.length, 2);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows
      .map(({ baseCode, quoteCode, rate, source, effectiveAt }) => [
        baseCode,
        quoteCode,
        rate,
        source,
        effectiveAt.toISOString(),
      ])
      .sort(),
    [
      ['USD', 'VES', '40', 'MARKET', '2026-09-30T00:00:00.000Z'],
      ['VES', 'USD', '0.025000000000', 'MARKET', '2026-09-30T00:00:00.000Z'],
      ['USD', 'VES', '50', 'MARKET', '2026-10-12T10:00:00.000Z'],
      ['VES', 'USD', '0.020000000000', 'MARKET', '2026-10-12T10:00:00.000Z'],
    ].sort(),
  );
});

test('invalid or unavailable upstream quotes never create rates', async () => {
  const created = [];
  const prisma = {
    fxRate: {
      upsert: async ({ create }) => {
        created.push(create);
        return create;
      },
    },
  };
  const sync = new BcvRateSync(prisma);
  await sync.refresh(current, previous, async () => ({
    ok: true,
    json: async () => ({ promedio: 0, fechaActualizacion: current.toISOString() }),
  }));
  assert.equal(created.length, 0);
});

test('two API instances use an atomic unique-key write for each published pair', async () => {
  const rows = [];
  const prisma = {
    fxRate: {
      upsert: async ({ where, create }) => {
        const key = where.baseCode_quoteCode_effectiveAt;
        const existing = rows.find(
          (row) =>
            row.baseCode === key.baseCode &&
            row.quoteCode === key.quoteCode &&
            row.effectiveAt.getTime() === key.effectiveAt.getTime(),
        );
        if (existing) return existing;
        rows.push(create);
        return create;
      },
    },
  };
  const fetcher = async (url) =>
    url.includes('historicos')
      ? { ok: false }
      : {
          ok: true,
          json: async () => ({ promedio: 50, fechaActualizacion: '2026-10-12T10:00:00Z' }),
        };
  await Promise.all([
    new BcvRateSync(prisma).refresh(current, previous, fetcher),
    new BcvRateSync(prisma).refresh(current, previous, fetcher),
  ]);
  assert.equal(rows.length, 2);
});
