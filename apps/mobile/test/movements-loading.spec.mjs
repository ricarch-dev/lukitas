import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMovementsData } from '../src/modules/movements/actions/load-movements.ts';

test('a categories outage preserves the loaded monthly history and accounts', async () => {
  const report = { items: [{ id: 'one' }], timezone: 'UTC', baseCurrency: 'USD' };
  const accounts = [{ id: 'cash' }];
  const client = {
    get: async (path) => path.startsWith('/reports?') ? report : accounts,
    categories: async () => { throw new Error('categories unavailable'); },
  };
  assert.deepEqual(await loadMovementsData(client, '2026-10'), {
    report, accounts, categories: [], categoriesUnavailable: true,
  });
});
