import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (label, message) => {
  throw new Error(`${label}: ${message}`);
};

const checks = [];
const expect = (label, condition, message) => {
  if (!condition) fail(label, message);
  checks.push(`${label}: pass`);
};

expect('workspace.reproducible-checkout', read('.node-version').trim() === '24.20.0', '.node-version must pin 24.20.0');
expect('workspace.reproducible-checkout', pkg.packageManager === 'pnpm@11.24.0', 'packageManager must pin pnpm@11.24.0');
expect('workspace.reproducible-checkout', pkg.engines?.node === '24.20.0' && pkg.engines?.pnpm === '11.24.0', 'engines must pin exact versions');
expect('workspace.reproducible-checkout', pkg.devDependencies?.typescript === '7.0.2', 'TypeScript must pin 7.0.2');
expect('workspace.reproducible-checkout', read('pnpm-workspace.yaml').includes('apps/*') && read('pnpm-workspace.yaml').includes('packages/*'), 'workspace globs must include apps/* and packages/*');
expect('workspace.reproducible-checkout', read('.gitignore').includes('.atl/'), '.atl/ must stay ignored');
expect('quality.clean-parity', read('.github/workflows/ci.yml').includes('pnpm install --frozen-lockfile') && read('.github/workflows/ci.yml').includes('pnpm gate') && read('.github/workflows/ci.yml').includes('node-version-file: .node-version'), 'CI must run the same pinned install and gate commands');

for (const entry of ['apps/mobile', 'apps/api', 'apps/api/prisma', 'infra/docker']) {
  expect('workspace.scope-boundary', existsSync(join(root, entry)), `${entry} is required by Phase 0`);
}
for (const entry of ['apps/api/prisma/migrations', 'packages/ui', 'supabase']) {
  expect('workspace.scope-boundary', !existsSync(join(root, entry)), `${entry} is outside the Phase 0 scope`);
}

const nestedGit = [];
const scan = (dir) => {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    const rel = relative(root, full);
    if (rel === '.git' || rel.startsWith('.git' + '\\')) continue;
    if (item.name === '.git') nestedGit.push(rel || '.git');
    if (item.isDirectory() && !['.git', '.atl', 'node_modules', '.pnpm-store', 'dist', 'coverage'].includes(item.name)) scan(full);
  }
};
scan(root);
expect('workspace.scope-boundary', nestedGit.length === 0, `nested git repositories are forbidden: ${nestedGit.join(', ')}`);

const tdd = spawnSync(process.execPath, [join(root, 'scripts', 'tdd-readiness.mjs')], { encoding: 'utf8' });
expect('quality.aggregated-failure', tdd.status === 0, tdd.stderr || tdd.stdout || 'tdd readiness must resolve cleanly');

const status = JSON.parse(tdd.stdout || '{}');
expect('quality.tdd-redetection', status.status === 'disabled' || status.status === 'ready', `strict TDD readiness returned an unexpected status (${status.reason ?? 'no reason'})`);

console.log(checks.join('\n'));
