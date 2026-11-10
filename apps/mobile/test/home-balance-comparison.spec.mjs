import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  balanceSummary,
  defaultDisplayCurrency,
} from '../src/modules/home/presentation/balance-summary.ts';

const root = join(import.meta.dirname, '..');
const screen = () =>
  readFileSync(join(root, 'src/modules/home/screens/dashboard-screen.tsx'), 'utf8');
const component = () =>
  readFileSync(join(root, 'src/modules/home/components/balance-summary.tsx'), 'utf8');

const valuation = (amount, partial = false, missingCurrencies = [], quotes = []) => ({
  amount,
  partial,
  missingCurrencies,
  quotes,
});
const dashboard = (current, previous, percentChange, ves = valuation('4250.00')) => ({
  baseCurrency: 'USD',
  comparison: {
    currentCutoff: '2026-10-07T10:00:00.000Z',
    previousCutoff: '2026-09-30T23:59:59.999Z',
    openingBalanceDate: 'ACCOUNT_CREATED_AT_APPROXIMATION',
    valuations: {
      USD: { current, previous, percentChange },
      EUR: { current, previous, percentChange },
      VES: { current: ves, previous: ves, percentChange },
    },
  },
});

test('display choice defaults to supported base and otherwise USD', () => {
  for (const currency of ['VES', 'USD', 'EUR'])
    assert.equal(defaultDisplayCurrency(currency), currency);
  for (const currency of ['USDT', 'GBP']) assert.equal(defaultDisplayCurrency(currency), 'USD');
});

test('complete current and prior values show API percentage and VES equivalent', () => {
  const result = balanceSummary(dashboard(valuation('10.00'), valuation('8.00'), '25.00'), 'USD');
  assert.equal(result.amount, '10.00');
  assert.equal(result.percentChange, '25.00');
  assert.equal(result.equivalent, '4250.00');
  assert.match(result.openingNote, /fecha de creación de cada cuenta.*aproximación/i);
  assert.deepEqual(result.warnings, []);
  assert.equal(
    balanceSummary(dashboard(valuation('10.00'), valuation('8.00'), '25.00'), 'VES').equivalent,
    null,
  );
});

test('partial selected valuation never advertises a complete balance or percentage', () => {
  const quotes = [{ baseCurrency: 'EUR', source: 'MANUAL', effectiveAt: '2026-09-29T12:00:00Z' }];
  const result = balanceSummary(
    dashboard(valuation('10.00', true, ['USDT'], quotes), valuation('8.00'), '25.00'),
    'USD',
  );
  assert.equal(result.percentChange, null);
  assert.equal(result.amount, '10.00');
  assert.match(result.warnings.join(' '), /parcial.*USDT/i);
  assert.match(result.evidence.join(' '), /EUR.*29\/09\/2026.*manual/i);
});

test('prior gaps, zero prior and unavailable VES equivalent remain explicit', () => {
  const priorGap = balanceSummary(
    dashboard(
      valuation('10.00'),
      valuation('8.00', true, ['GBP']),
      null,
      valuation('400.00', true, ['USDT']),
    ),
    'EUR',
  );
  assert.equal(priorGap.percentChange, null);
  assert.equal(priorGap.equivalent, null);
  assert.match(priorGap.warnings.join(' '), /mes anterior.*GBP/i);
  assert.match(priorGap.warnings.join(' '), /bolívares.*USDT/i);
  const zero = balanceSummary(dashboard(valuation('10.00'), valuation('0.00'), null), 'USD');
  assert.match(zero.warnings.join(' '), /saldo anterior es cero/i);
  assert.equal(zero.percentChange, null);
  const loss = balanceSummary(dashboard(valuation('5.00'), valuation('10.00'), '-50.00'), 'USD');
  assert.equal(loss.percentChange, '-50.00');
});

test('Cuentas can hide monthly comparison while retaining current balance and FX evidence', () => {
  const currentQuotes = [
    { baseCurrency: 'EUR', source: 'MANUAL', effectiveAt: '2026-10-06T12:00:00Z' },
  ];
  const previousQuotes = [
    { baseCurrency: 'GBP', source: 'MARKET', effectiveAt: '2026-09-30T12:00:00Z' },
  ];
  const complete = balanceSummary(
    dashboard(
      valuation('10.00', false, [], currentQuotes),
      valuation('8.00', false, [], previousQuotes),
      '25.00',
    ),
    'USD',
    false,
  );
  assert.equal(complete.percentChange, null);
  assert.equal(complete.openingNote, null);
  assert.match(complete.evidence.join(' '), /Actual: EUR a USD/);
  assert.doesNotMatch(complete.evidence.join(' '), /Mes anterior: GBP/);

  const partial = balanceSummary(
    dashboard(
      valuation('12.00', true, ['CAD'], currentQuotes),
      valuation('8.00', true, ['GBP'], previousQuotes),
      '25.00',
      valuation(
        '400.00',
        true,
        ['USD'],
        [{ baseCurrency: 'USD', source: 'MARKET', effectiveAt: '2026-10-06T12:00:00Z' }],
      ),
    ),
    'USD',
    false,
  );
  assert.match(partial.warnings.join(' '), /Saldo actual parcial.*CAD/);
  assert.match(partial.warnings.join(' '), /Equivalente en bolívares.*USD/);
  assert.doesNotMatch(partial.warnings.join(' '), /mes anterior|saldo anterior es cero/i);
  assert.match(partial.evidence.join(' '), /Actual: EUR a USD/);
  assert.match(partial.evidence.join(' '), /Equivalente en bolívares: USD a VES/);
  assert.doesNotMatch(partial.evidence.join(' '), /Mes anterior: GBP/);

  const zeroPrior = balanceSummary(
    dashboard(valuation('10.00'), valuation('0.00'), null),
    'USD',
    false,
  );
  assert.doesNotMatch(zeroPrior.warnings.join(' '), /saldo anterior es cero/i);
});

test('home keeps existing data and navigation while selection is accessible', () => {
  assert.match(screen(), /<BalanceSummary dashboard={dashboard} \/>/);
  assert.match(component(), /accessibilityRole="radiogroup"/);
  assert.match(component(), /accessibilityRole="radio"/);
  assert.match(component(), /accessibilityState=\{\{ selected:/);
  assert.match(screen(), /dashboard\.flow\.income/);
  assert.match(screen(), /activeDashboardAccounts\(dashboard\)/);
  assert.match(screen(), /dashboardDisclosure\(dashboard\)/);
  assert.match(screen(), /dashboardShortcuts\.map/);
  assert.match(screen(), /href="\/informes"/);
});

test('decorative flow icons do not forward a non-boolean accessible prop to SVG', () => {
  const source = screen();
  assert.match(source, /<MoveUp aria-hidden=\{true\} size=\{17\}/);
  assert.match(source, /<MoveDown aria-hidden=\{true\} size=\{17\}/);
  assert.doesNotMatch(source, /<(?:MoveUp|MoveDown)\s+accessible=/);
});
