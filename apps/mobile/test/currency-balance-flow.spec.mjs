import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { currencyAccountBalances } from '../src/modules/accounts/presentation/currency-balances.ts';

const root = join(import.meta.dirname, '..', 'src');
const source = (path) => readFileSync(join(root, path), 'utf8');
const account = (id, code, balance, bankGroup = null) => ({
  id,
  name: `Cuenta ${id}`,
  currency: { code, precision: 2 },
  balance,
  openingBalance: '0.00',
  archived: false,
  bankGroup,
});

test('cards include only currencies with active accounts and sum native balances exactly', () => {
  const balances = currencyAccountBalances([
    account('a', 'VES', '0.10'),
    account('b', 'VES', '0.20'),
    account('c', 'USD', '4.00'),
    account('d', 'EUR', '9.00'),
    { ...account('e', 'USD', '8.00'), archived: true },
  ]);
  assert.deepEqual(balances, [
    { code: 'VES', label: 'Bolívares', amount: '0.30', count: 2 },
    { code: 'USD', label: 'Dólares', amount: '4.00', count: 1 },
  ]);
  assert.deepEqual(currencyAccountBalances([]), []);
  assert.deepEqual(currencyAccountBalances([account('only', 'USD', '0.00')]), [
    { code: 'USD', label: 'Dólares', amount: '0.00', count: 1 },
  ]);
});

test('Inicio links currency cards to the existing currency-filtered accounts view', () => {
  const home = source('modules/home/screens/dashboard-screen.tsx');
  assert.match(home, /currencyAccountBalances\(accounts\)/);
  assert.match(home, /pathname: '\/cuentas', params: \{ moneda: balance\.code \}/);
  assert.doesNotMatch(home, /groupedDashboardAccounts\(accounts\)\.map/);
});

test('currency accounts can open the corresponding read-only individual detail', () => {
  const accounts = source('modules/accounts/screens/accounts-screen.tsx');
  const detail = source('modules/accounts/screens/account-detail-screen.tsx');
  const route = source('app/cuenta/[id].tsx');
  assert.match(accounts, /moneda === 'VES' \|\| moneda === 'USD'/);
  assert.match(accounts, /pathname: '\/cuenta\/\[id\]', params: \{ id: account\.id \}/);
  assert.match(detail, /account\.balance/);
  assert.match(detail, /account\.currency\.code/);
  assert.match(detail, /account\.openingBalance/);
  assert.match(detail, /activity\.filter\(\(item\) => item\.accountId === id/);
  assert.match(route, /<RootNavigator>/);
  assert.doesNotMatch(detail, /Transferir|Editar|Buscar movimiento/);
});
