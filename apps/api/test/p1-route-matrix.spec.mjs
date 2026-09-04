import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/modules/p1.module.ts', import.meta.url), 'utf8');

test('P1 routes are versioned and guarded', () => {
  for (const route of ['categories', 'budgets', 'recurring-rules', 'reports']) {
    assert.match(source, new RegExp(`Controller\\(['"]${route}['"]\\)`));
  }
  assert.equal((source.match(/@UseGuards\(AuthGuard\)/g) ?? []).length >= 4, true);
  assert.match(source, /catch-up/);
});

test('P1 services enforce ownership before writes', () => {
  assert.match(source, /where: \{ id: body\?\.categoryId, userId, archivedAt: null \}/);
  assert.match(source, /where: \{ id: body\?\.accountId, userId, archivedAt: null \}/);
  assert.match(source, /where: \{ id, userId \}/);
});
