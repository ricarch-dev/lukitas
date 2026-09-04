import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync(join(import.meta.dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

test('P0 schema contains ownership, immutable facts and exact numeric fields', () => {
  for (const model of ['User', 'UserPreferences', 'Account', 'Transaction', 'LedgerEntry', 'Transfer', 'FxRate', 'FxSnapshot', 'RefreshSession', 'AuditEvent', 'IdempotencyKey']) {
    assert.match(schema, new RegExp(`model\\s+${model}\\s+`));
  }
  assert.match(schema, /openingBalance Decimal\s+@db\.Decimal\(20, 8\)/);
  assert.match(schema, /signedAmount\s+Decimal\s+@db\.Decimal\(20, 8\)/);
  assert.match(schema, /rate\s+Decimal\s+@db\.Decimal\(24, 12\)/);
  assert.match(schema, /@@unique\(\[userId, key\]\)/);
  assert.match(schema, /voidedAt\s+DateTime\?/);
});
