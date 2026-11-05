import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const nodeCommand = manifest.scripts.start.split(' && node ')[1];
const flags = nodeCommand.split(' ').slice(0, -1);
const scratch = mkdtempSync(join(tmpdir(), 'lukitas-api-env-'));
console.info(`Environment probe scratch: ${scratch}`);
const env = { ...process.env };
delete env.DATABASE_URL;
const run = (environment = env) => spawnSync(process.execPath,
  [...flags, '-p', "JSON.stringify(process.env.DATABASE_URL ?? null)"],
  { cwd: scratch, env: environment, encoding: 'utf8' });

test('API startup retains process environment when optional files are absent', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout), null);
});

test('API startup loads local configuration while explicit process environment wins', () => {
  writeFileSync(join(scratch, '.env'), 'DATABASE_URL=postgresql://example.invalid/base\n');
  writeFileSync(join(scratch, '.env.local'), 'DATABASE_URL=postgresql://example.invalid/local\n');
  const local = run();
  assert.equal(local.status, 0, local.stderr);
  assert.equal(JSON.parse(local.stdout), 'postgresql://example.invalid/local');
  const supplied = run({ ...env, DATABASE_URL: 'postgresql://example.invalid/supplied' });
  assert.equal(supplied.status, 0, supplied.stderr);
  assert.equal(JSON.parse(supplied.stdout), 'postgresql://example.invalid/supplied');
});
