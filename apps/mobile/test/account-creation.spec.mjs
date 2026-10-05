import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { groupedDashboardAccounts } from '../src/features/home-dashboard-layout.ts';
import { AccountInputError, submitAccount } from '../src/features/create-account-submit.ts';

test('mock account journey sends exact native VES and USD balances and groups on refresh', async () => {
  const accounts = [];
  const posts = [];
  const post = async (path, input, key) => {
    posts.push({ path, key });
    const group = input.bankGroupId
      ? accounts.find((account) => account.bankGroup?.id === input.bankGroupId)?.bankGroup
      : input.bankName ? { id: 'bank-1', name: input.bankName } : null;
    const account = { ...input, id: `account-${accounts.length + 1}`, balance: input.openingBalance,
      currency: { code: input.currencyCode, precision: 2 }, bankGroup: group, archived: false };
    accounts.push(account);
    return account;
  };
  const ves = await submitAccount({ name: ' Corriente ', balance: '12,50', currencyCode: 'VES', bankName: 'Banco Ejemplo' }, post, 'ves-key');
  const usd = await submitAccount({ name: 'Divisas', balance: '3.25', currencyCode: 'USD', bankGroupId: ves.bankGroup.id }, post, 'usd-key');
  assert.deepEqual(posts, [{ path: '/accounts', key: 'ves-key' }, { path: '/accounts', key: 'usd-key' }]);
  assert.equal(ves.openingBalance, '12.50');
  assert.equal(usd.openingBalance, '3.25');
  const refreshed = structuredClone(accounts).reverse();
  const groups = groupedDashboardAccounts(refreshed);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, 'Banco Ejemplo');
  assert.deepEqual(groups[0].accounts.map((account) => account.currency.code), ['VES', 'USD']);
});

test('invalid account inputs never send a request', async () => {
  const post = () => { throw new Error('unexpected request'); };
  for (const input of [
    { name: ' ', balance: '0', currencyCode: 'USD' },
    { name: 'Cash', balance: '-1', currencyCode: 'USD' },
    { name: 'Cash', balance: '0.001', currencyCode: 'USD' },
    { name: 'Cash', balance: '0', currencyCode: 'USD', bankName: '  ' },
  ]) await assert.rejects(submitAccount(input, post, 'key'), AccountInputError);
});

test('USDT remains an exact six-decimal account option', async () => {
  let sent;
  await submitAccount({ name: 'Wallet', balance: '0.000001', currencyCode: 'USDT' }, async (_path, request) => {
    sent = request;
    return { id: 'wallet' };
  }, 'wallet-key');
  assert.equal(sent.openingBalance, '0.000001');
  assert.equal(sent.currencyCode, 'USDT');
});

test('Inicio floating action opens the protected account form route', () => {
  const root = join(import.meta.dirname, '..', 'src');
  const home = readFileSync(join(root, 'features', 'screens.tsx'), 'utf8');
  const layout = readFileSync(join(root, 'app', '_layout.tsx'), 'utf8');
  const route = readFileSync(join(root, 'app', 'crear-cuenta.tsx'), 'utf8');
  assert.match(home, /href="\/crear-cuenta"/);
  assert.match(home, /position: 'absolute'/);
  assert.match(layout, /name="crear-cuenta"/);
  assert.match(route, /RootNavigator/);
});
