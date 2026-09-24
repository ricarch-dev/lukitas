import test from 'node:test';
import assert from 'node:assert/strict';
import { monthBounds, monthKeyAt, nextOccurrenceAt, normalizeCategoryName } from '../src/index.ts';

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

test('monthBounds returns a half-open UTC month', () => {
  const bounds = monthBounds('2026-02', 'UTC');
  assert.equal(bounds.from.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(bounds.to.toISOString(), '2026-03-01T00:00:00.000Z');
});

test('monthBounds resolves different DST offsets at each local month boundary', () => {
  const bounds = monthBounds('2026-03', 'America/New_York');
  assert.equal(bounds.from.toISOString(), '2026-03-01T05:00:00.000Z');
  assert.equal(bounds.to.toISOString(), '2026-04-01T04:00:00.000Z');
});

test('monthBounds rolls December into the following year', () => {
  const bounds = monthBounds('2026-12', 'UTC');
  assert.equal(bounds.from.toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(bounds.to.toISOString(), '2027-01-01T00:00:00.000Z');
});

test('monthBounds rejects malformed month keys and unsupported timezones', () => {
  assert.throws(() => monthBounds('2026-13', 'UTC'), {
    name: 'RangeError',
    message: 'month must be YYYY-MM',
  });
  assert.throws(() => monthBounds('2026-03', 'Mars/Olympus'), {
    name: 'RangeError',
    message: 'Unsupported timezone',
  });
});
