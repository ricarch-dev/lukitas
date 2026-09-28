import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tsc = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

test('start explicitly builds before executing the emitted entrypoint', () => {
  const { scripts } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(scripts.start, `pnpm run build && node dist/apps/api/src/main.js`);
});

test('TypeScript build emits the PrismaService constructor token for health', async () => {
  const buildDir = mkdtempSync(join(root, '.tmp-api-metadata-'));
  try {
    const build = spawnSync(tsc, ['-p', 'tsconfig.json', '--outDir', buildDir], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const { HealthController } = await import(pathToFileURL(join(buildDir, 'apps', 'api', 'src', 'common', 'health.js')).href);
    const { PrismaService } = await import(pathToFileURL(join(buildDir, 'apps', 'api', 'src', 'common', 'prisma.js')).href);
    assert.deepEqual(Reflect.getMetadata('design:paramtypes', HealthController), [PrismaService]);
  } finally {
    rmSync(buildDir, { force: true, recursive: true });
  }
});
