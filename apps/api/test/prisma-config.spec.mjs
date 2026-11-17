import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js');
const env = { ...process.env, CI: '1' };
delete env.DATABASE_URL;

function runPrisma(args) {
  return spawnSync(process.execPath, [prismaCli, ...args, '--schema', 'prisma/schema.prisma'], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

test('Prisma generates the client without a database URL', () => {
  const result = runPrisma(['generate']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Generated Prisma Client/);
});

test('Prisma has a local file URL when none is supplied', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      "import assert from 'node:assert/strict'; import config from './prisma.config.ts'; assert.equal(config.datasource?.url, 'file:./prisma/dev.db');",
    ],
    { cwd: root, env, encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Prisma config retains a supplied URL without connecting to it', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      "import assert from 'node:assert/strict'; import config from './prisma.config.ts'; assert.equal(config.datasource?.url, process.env.DATABASE_URL);",
    ],
    {
      cwd: root,
      env: { ...env, DATABASE_URL: 'file:./unused.db' },
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
