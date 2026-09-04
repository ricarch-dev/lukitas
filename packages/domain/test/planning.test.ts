import test from 'node:test';
import assert from 'node:assert/strict';
import { monthKeyAt, nextOccurrenceAt, normalizeCategoryName } from '../src/index.ts';

test('planning rules normalize category names case-insensitively', () => {
  assert.equal(normalizeCategoryName('  Food   & dining '), 'food & dining');
  assert.throws(() => normalizeCategoryName('   '));
});

test('monthKeyAt uses the requested local timezone', () => {
  assert.equal(monthKeyAt(new Date('2026-03-01T01:00:00.000Z'), 'America/New_York'), '2026-02');
});

test('recurrence cadence advances in UTC schedule order', () => {
  const value = new Date('2026-01-31T12:00:00.000Z');
  assert.equal(nextOccurrenceAt(value, 'DAILY').toISOString(), '2026-02-01T12:00:00.000Z');
  assert.equal(nextOccurrenceAt(value, 'WEEKLY').toISOString(), '2026-02-07T12:00:00.000Z');
  assert.equal(nextOccurrenceAt(value, 'MONTHLY').toISOString(), '2026-02-28T12:00:00.000Z');
});
