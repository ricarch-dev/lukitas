import assert from 'node:assert/strict';
import { test } from 'node:test';
import { debtOutstanding, debtStatus, debtCashEffect, debtReduction } from '../src/debts.ts';

test('partial settlements leave an exact outstanding amount and reject overpayment', () => {
  assert.equal(debtOutstanding('100.10', ['0.10', '25.00']), '75.00');
  assert.equal(debtOutstanding('0.000003', ['0.000001']), '0.000002');
  assert.throws(() => debtOutstanding('100.00', ['100.01']), /exceed/);
});

test('status uses the local due date and settles independently of the due date', () => {
  assert.equal(debtStatus('1.00', '2026-11-16', '2026-11-16'), 'PENDING');
  assert.equal(debtStatus('1.00', '2026-11-15', '2026-11-16'), 'OVERDUE');
  assert.equal(debtStatus('1.00', null, '2026-11-16'), 'PENDING');
  assert.equal(debtStatus('0.00', '2026-01-01', '2026-11-16'), 'SETTLED');
});

test('origination and repayment have opposite cash effects for each direction', () => {
  assert.equal(debtCashEffect('PAYABLE', 'ORIGINATION', '10.00'), '10.00');
  assert.equal(debtCashEffect('PAYABLE', 'PAYMENT', '10.00'), '-10.00');
  assert.equal(debtCashEffect('RECEIVABLE', 'ORIGINATION', '10.00'), '-10.00');
  assert.equal(debtCashEffect('RECEIVABLE', 'PAYMENT', '10.00'), '10.00');
});

test('cross-currency payment uses debt units per cash unit and rounds once', () => {
  assert.equal(debtReduction('1000.00', 'VES', 'USD', '0.025'), '25.00');
  assert.equal(debtReduction('1.00', 'USD', 'EUR', '0.995'), '1.00');
  assert.equal(debtReduction('0.000001', 'USDT', 'USDT'), '0.000001');
  assert.throws(() => debtReduction('10.00', 'VES', 'USD'), /rate/);
  assert.throws(() => debtReduction('0.01', 'VES', 'USD', '0.001'), /zero/);
  assert.throws(() => debtReduction('10.00', 'USD', 'USD', '2'), /same/);
});
