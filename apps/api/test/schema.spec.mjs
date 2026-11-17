import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync(join(import.meta.dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const usdtMigration = readFileSync(
  join(
    import.meta.dirname,
    '..',
    'prisma',
    'migrations',
    '20260922190000_usdt_monetary_unit',
    'migration.sql',
  ),
  'utf8',
);
const sqliteMigration = readFileSync(
  join(
    import.meta.dirname,
    '..',
    'prisma',
    'migrations-sqlite',
    '20261112180000_initial',
    'migration.sql',
  ),
  'utf8',
);

const currencyColumns = [
  ['Currency', 'code'],
  ['UserPreferences', 'baseCurrency'],
  ['Account', 'currencyCode'],
  ['Transaction', 'currencyCode'],
  ['Transfer', 'sourceCurrency'],
  ['Transfer', 'destinationCurrency'],
  ['FxRate', 'baseCode'],
  ['FxRate', 'quoteCode'],
  ['FxSnapshotRate', 'baseCode'],
  ['FxSnapshotRate', 'quoteCode'],
  ['Budget', 'currencyCode'],
  ['RecurringRule', 'currencyCode'],
  ['TransactionFxSnapshot', 'sourceCurrency'],
  ['TransactionFxSnapshot', 'baseCurrency'],
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('P0 schema contains ownership, immutable facts and exact numeric fields', () => {
  for (const model of [
    'User',
    'UserPreferences',
    'Account',
    'Transaction',
    'LedgerEntry',
    'Transfer',
    'FxRate',
    'FxSnapshot',
    'RefreshSession',
    'AuditEvent',
    'IdempotencyKey',
  ]) {
    assert.match(schema, new RegExp(`model\\s+${model}\\s+`));
  }
  assert.match(schema, /openingBalance\s+String\b/);
  assert.match(schema, /signedAmount\s+String\b/);
  assert.match(schema, /rate\s+String\b/);
  assert.doesNotMatch(sqliteMigration, /\bDECIMAL\b/);
  assert.match(sqliteMigration, /"openingBalance" TEXT NOT NULL/);
  assert.match(sqliteMigration, /'USDT', 6, true/);
  assert.match(schema, /@@unique\(\[userId, key\]\)/);
  assert.match(schema, /voidedAt\s+DateTime\?/);
});

test('fresh local database uses SQLite without PostgreSQL native column types', () => {
  assert.match(schema, /datasource db \{\s*provider = "sqlite"\s*\}/);
  assert.doesNotMatch(schema, /@db\.(?:Uuid|VarChar|Decimal|Timestamptz)/);
});

test('all active currency-code schema fields admit four-character monetary-unit codes', () => {
  assert.strictEqual(currencyColumns.length, 14);

  for (const [model, column] of currencyColumns) {
    const modelBlock = schema.match(new RegExp(`model\\s+${model}\\s+\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(modelBlock, `missing ${model} model`);
    assert.match(
      modelBlock[1],
      new RegExp(`\\b${escapeRegExp(column)}\\s+String\\b`),
      `${model}.${column} must remain a string monetary-unit code`,
    );
  }

  assert.doesNotMatch(schema, /@db\.VarChar\(3\)/);
  assert.match(schema, /active\s+Boolean\s+@default\(true\)/);
});

test('USDT migration widens all physical columns and upserts active metadata', () => {
  assert.strictEqual(usdtMigration.match(/TYPE VARCHAR\(4\)/g)?.length, 14);

  for (const [table, column] of currencyColumns) {
    assert.match(
      usdtMigration,
      new RegExp(
        `ALTER TABLE "${escapeRegExp(table)}"[\\s\\S]*?ALTER COLUMN "${escapeRegExp(column)}" TYPE VARCHAR\\(4\\)`,
      ),
      `migration must widen ${table}.${column}`,
    );
  }

  assert.match(
    usdtMigration,
    /INSERT INTO "Currency" \("code", "precision", "active"\)\s+VALUES \('USDT', 6, TRUE\)/,
  );
  assert.match(usdtMigration, /ON CONFLICT \("code"\) DO UPDATE/);
  assert.match(
    usdtMigration,
    /SET "precision" = EXCLUDED\."precision", "active" = EXCLUDED\."active"/,
  );
});
