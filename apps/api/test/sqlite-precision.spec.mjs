import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));

test('fresh SQLite migration persists exact money and rate strings across connections', async (t) => {
  const scratch = mkdtempSync(join(tmpdir(), 'opencode', 'lukitas-sqlite-precision-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const url = `file:${join(scratch, 'lukitas.db').replaceAll('\\', '/')}`;
  const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(migration.error, undefined);
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);

  const probe = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./sqlite-precision-probe.mjs', import.meta.url))],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url },
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(probe.error, undefined);
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
  assert.equal(probe.stdout.trim(), 'Exact SQLite monetary values survived reconnection');
});
