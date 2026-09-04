import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaces = [
  'apps/mobile',
  'apps/api',
  'packages/contracts',
  'packages/domain',
  'packages/config',
];
const hasTargets = workspaces.every((path) => {
  const manifest = join(root, path, 'package.json');
  if (!existsSync(manifest)) {
    return false;
  }

  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  return Boolean(pkg.scripts?.smoke || pkg.scripts?.test);
});

const result = {
  status: hasTargets ? 'ready' : 'disabled',
  reason: hasTargets
    ? 'deterministic targets exist'
    : 'not every workspace has a deterministic target yet',
  localCommand: 'pnpm gate',
  ciCommand: 'pnpm gate',
  packageManager: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager,
};

process.stdout.write(`${JSON.stringify(result)}\n`);
