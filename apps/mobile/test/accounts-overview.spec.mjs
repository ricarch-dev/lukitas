import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACCOUNT_CURRENCY_FILTERS } from '../src/modules/accounts/presentation/accounts-overview.ts';

const root = join(import.meta.dirname, '..');
const source = (relative) => readFileSync(join(root, 'src', relative), 'utf8');

test('account currency filters are all, VES and USD only', () => {
  assert.deepEqual(
    ACCOUNT_CURRENCY_FILTERS.map(({ value }) => value),
    [null, 'VES', 'USD'],
  );
});

test('accounts overview uses the filtered dashboard and preserves quote disclosures', () => {
  const screen = source('modules/accounts/screens/accounts-screen.tsx');
  const hook = source('shared/hooks/use-dashboard.ts');
  const summary = source('modules/home/components/balance-summary.tsx');
  const presentation = source('modules/home/presentation/balance-summary.ts');
  assert.match(screen, /useDashboard\(accountCurrency \?\? undefined\)/);
  assert.match(hook, /accountCurrency=\$\{accountCurrency\}/);
  assert.match(
    screen,
    /<BalanceSummary dashboard=\{dashboard\} showMonthlyComparison=\{false\} \/>/,
  );
  assert.match(
    summary,
    /\{showMonthlyComparison \? \([\s\S]*Corte del mes anterior:[\s\S]*\) : null\}/,
  );
  assert.match(summary, /summary\.openingNote/);
  assert.match(summary, /summary\.openingNote !== null/);
  assert.match(presentation, /fecha de creación de cada cuenta como aproximación/i);
  assert.match(screen, /dashboard\.totals\.warnings/);
  assert.doesNotMatch(screen, /disclosure\.flow|dashboard\.flow\.warnings/);
  assert.match(screen, /account\.balance\} \{account\.currency\.code\}/);
  assert.match(screen, /group\.name/);
});

test('overview exposes accessible filters, account creation, and all request states', () => {
  const screen = source('modules/accounts/screens/accounts-screen.tsx');
  assert.match(screen, /accessibilityRole="radiogroup"/);
  assert.match(screen, /accessibilityRole="radio"/);
  assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
  assert.match(screen, /<Link href="\/crear-cuenta" asChild>/);
  assert.match(screen, /style=\{styles\.addLink\}/);
  assert.match(screen, /accessibilityRole="alert"/);
  assert.match(screen, /isLoading \|\| !dashboard/);
  assert.match(screen, /No hay cuentas para este filtro/);
});

test('Inicio fits four shortcuts without forcing horizontal overflow', () => {
  const screen = source('modules/home/screens/dashboard-screen.tsx');
  const styles = source('modules/home/styles/home-dashboard-styles.ts');
  assert.match(screen, /label: 'Cuentas'/);
  assert.match(screen, /href: '\/cuentas'/);
  assert.match(styles, /shortcutRow: \{[^}]*flexWrap: 'wrap'/);
  assert.match(styles, /shortcut: \{[^}]*minWidth: 72/);
});
