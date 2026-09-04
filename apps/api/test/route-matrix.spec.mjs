import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(import.meta.dirname, '..', 'src', 'main.ts'), 'utf8');
const moduleSource = readFileSync(
  join(import.meta.dirname, '..', 'src', 'modules', 'p0.module.ts'),
  'utf8',
);

test('API exposes a versioned prefix while preserving the health probe', () => {
  assert.match(source, /setGlobalPrefix\(['"]v1['"]/);
  assert.match(source, /exclude:\s*\[['"]health['"]\]/);
});

test('protected financial controllers use the auth guard', () => {
  assert.equal((moduleSource.match(/@UseGuards\(AuthGuard\)/g) ?? []).length >= 5, true);
  assert.match(moduleSource, /Authentication required/);
});
