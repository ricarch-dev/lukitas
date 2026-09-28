import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuthEmail, isValidRegistrationPassword } from '../src/auth.ts';

test('auth email normalization retains the API syntax and casing rules', () => {
  assert.equal(normalizeAuthEmail('  PERSON@Example.com  '), 'person@example.com');
  for (const value of ['', 'not-an-email', 'person@host', 'person @host.com', null])
    assert.equal(normalizeAuthEmail(value), null);
});

test('registration passwords require at least eight characters without trimming', () => {
  assert.equal(isValidRegistrationPassword('12345678'), true);
  assert.equal(isValidRegistrationPassword('1234567'), false);
  assert.equal(isValidRegistrationPassword(null), false);
});
