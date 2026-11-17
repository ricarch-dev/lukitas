import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('debt API migration and principal lifecycle against isolated SQLite', (t) => {
  const scratch = mkdtempSync(join(tmpdir(), 'opencode', 'lukitas-debts-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const env = {
    ...process.env,
    DATABASE_URL: `file:${join(scratch, 'test.db').replaceAll('\\', '/')}`,
  };
  delete env.NODE_TEST_CONTEXT;
  const options = { cwd: join(import.meta.dirname, '..'), env, encoding: 'utf8', timeout: 30_000 };
  const migration = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    options,
  );
  assert.equal(migration.error, undefined);
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  // A subprocess releases libSQL native file handles before Windows removes the database.
  const probe = spawnSync(process.execPath, ['test/debts-probe.mjs'], options);
  assert.equal(probe.error, undefined);
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
