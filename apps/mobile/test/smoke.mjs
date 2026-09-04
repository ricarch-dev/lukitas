import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const expo = process.platform === 'win32' ? join(root, 'node_modules', '.bin', 'expo.cmd') : join(root, 'node_modules', '.bin', 'expo');
const outDir = mkdtempSync(join(tmpdir(), 'lukitas-mobile-smoke-'));

try {
  const result = spawnSync(expo, ['export', '--platform', 'web', '--output-dir', outDir], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1' },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'expo export failed');
  }

  console.log('mobile.smoke: pass');
} finally {
  rmSync(outDir, { force: true, recursive: true });
}
