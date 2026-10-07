import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardPeriod, startOfMonthInTimezone, previousBalanceCutoff } from '../src/modules/dashboard-timezone.ts';

test('dashboard uses the preference timezone for the start of the current month', () => {
  const clock = new Date('2026-09-01T03:30:00.000Z');
  assert.equal(
    startOfMonthInTimezone(clock, 'America/New_York').toISOString(),
    '2026-08-01T04:00:00.000Z',
  );
  assert.equal(
    startOfMonthInTimezone(clock, 'Asia/Tokyo').toISOString(),
    '2026-08-31T15:00:00.000Z',
  );
  assert.equal(
    dashboardPeriod('America/New_York', undefined, undefined, clock).from.toISOString(),
    '2026-08-01T04:00:00.000Z',
  );
});

test('previous balance cutoff is the local month boundary even across DST and year changes', () => {
  assert.equal(previousBalanceCutoff(new Date('2026-11-20T10:00:00Z'), 'America/New_York').toISOString(),
    '2026-11-01T04:00:00.000Z');
  assert.equal(previousBalanceCutoff(new Date('2026-01-01T01:00:00Z'), 'Asia/Tokyo').toISOString(),
    '2025-12-31T15:00:00.000Z');
});
