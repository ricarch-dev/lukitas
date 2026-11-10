import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarMonths,
  canExportMovements,
  changeMonth,
  filterMovements,
  monthlyFlow,
  movementsCsv,
  movementDay,
} from '../src/modules/movements/presentation/movements.ts';

const items = [
  {
    id: 'a',
    accountId: 'cash',
    kind: 'INCOME',
    amount: '10.50',
    currencyCode: 'USD',
    occurredAt: '2026-10-04T12:00:00Z',
    note: 'Salary',
    categoryId: 'work',
  },
  {
    id: 'b',
    accountId: 'cash',
    kind: 'EXPENSE',
    amount: '2.25',
    currencyCode: 'USD',
    occurredAt: '2026-10-05T12:00:00Z',
    note: 'Coffee',
    categoryId: 'food',
  },
  {
    id: 'c',
    accountId: 'cash',
    kind: 'EXPENSE',
    amount: '3.00',
    currencyCode: 'USD',
    occurredAt: '2026-10-06T12:00:00Z',
    note: 'Transfer',
    transferId: 't1',
  },
  {
    id: 'd',
    accountId: 'bank',
    kind: 'INCOME',
    amount: '3.00',
    currencyCode: 'EUR',
    occurredAt: '2026-10-06T12:00:00Z',
    transferId: 't1',
  },
];

test('month navigation crosses year boundaries without mutating the current month', () => {
  assert.equal(changeMonth('2026-12', 1), '2027-01');
  assert.equal(changeMonth('2026-01', -1), '2025-12');
});

test('calendar day uses the report timezone instead of the device UTC day', () => {
  assert.equal(movementDay('2026-03-01T02:00:00Z', 'America/New_York'), '2026-02-28');
});

test('all-month calendar groups every visible period rather than hiding prior months', () => {
  assert.deepEqual(
    calendarMonths(
      [
        { ...items[0], occurredAt: '2026-10-01T12:00:00Z' },
        { ...items[1], occurredAt: '2026-09-30T12:00:00Z' },
      ],
      'UTC',
    ),
    ['2026-10', '2026-09'],
  );
});

test('search spans all supplied months; type, category and period filters compose', () => {
  assert.deepEqual(
    filterMovements(items, { search: 'coffee' }).map((item) => item.id),
    ['b'],
  );
  assert.deepEqual(
    filterMovements(items, { kind: 'EXPENSE', categoryId: 'food', month: '2026-10' }).map(
      (item) => item.id,
    ),
    ['b'],
  );
  assert.deepEqual(filterMovements(items, { month: '2026-09' }), []);
});

test('monthly flow excludes internal transfers and never combines unrelated currencies', () => {
  assert.deepEqual(monthlyFlow(items), { income: { USD: '10.50' }, expense: { USD: '2.25' } });
  assert.deepEqual(
    monthlyFlow([...items, { ...items[0], id: 'e', currencyCode: 'EUR', amount: '4.00' }]).income,
    { USD: '10.50', EUR: '4.00' },
  );
});

test('CSV includes every movement, escapes delimiters and spreadsheet formulas', () => {
  const csv = movementsCsv(
    [{ ...items[0], note: '=SUM(1,1)\nHi' }],
    { cash: 'Main account' },
    { work: 'Work' },
  );
  assert.match(csv, /^\uFEFFDate,Type,Account,Category,Amount,Currency,Note\r\n/);
  assert.match(csv, /"'=SUM\(1,1\)\nHi"/);
  assert.match(csv, /Main account,Work,10\.50/);
  assert.equal(csv.trimEnd().split('\r\n').length, 2);
});

test('failed or pending month fetch cannot export stale report under another filename', () => {
  assert.equal(canExportMovements('2026-09', '2026-10', true, false, ''), false);
  assert.equal(canExportMovements('2026-10', '2026-10', true, false, 'Connection failed'), false);
  assert.equal(canExportMovements('2026-10', '2026-10', true, true, ''), false);
  assert.equal(canExportMovements('2026-10', '2026-10', true, false, ''), true);
});
