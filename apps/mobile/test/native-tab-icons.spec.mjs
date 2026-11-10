import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const requireFromMobile = createRequire(join(root, 'package.json'));

test('Android native tab icons have their required Expo Symbols dependency', () => {
  const layout = readFileSync(join(root, 'src', 'app', '(tabs)', '_layout.tsx'), 'utf8');
  const manifest = requireFromMobile('./package.json');

  assert.match(layout, /<NativeTabs\.Trigger\.Icon\s+[^>]*md=/);
  assert.ok(manifest.dependencies['expo-symbols']);
  assert.ok(requireFromMobile.resolve('expo-symbols'));
  const requireFromRouter = createRequire(requireFromMobile.resolve('expo-router/package.json'));
  const symbolsEntry = requireFromRouter.resolve('expo-symbols');
  assert.match(readFileSync(symbolsEntry, 'utf8'), /unstable_getMaterialSymbolSourceAsync/);
});
