import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(readFileSync(join(root, 'tsconfig.base.json'), 'utf8'));

assert.equal(config.compilerOptions.target, 'ES2022');
assert.equal(config.compilerOptions.module, 'NodeNext');
assert.equal(config.compilerOptions.moduleResolution, 'NodeNext');
assert.equal(config.compilerOptions.strict, true);

console.log('config.test: pass');
