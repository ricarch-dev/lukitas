import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const steps = [
  ['workspace.reproducible-checkout', [process.execPath, join(root, 'scripts', 'check-workspace.mjs')]],
  ['quality.tdd-redetection', [process.execPath, join(root, 'scripts', 'tdd-readiness.mjs')]],
];

for (const [label, command] of steps) {
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${label}: gate failed`);
  }
}

console.log('quality.aggregated-failure: pass');
