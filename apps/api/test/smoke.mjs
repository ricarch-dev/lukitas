import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const prisma = process.platform === 'win32' ? join(root, 'node_modules', '.bin', 'prisma.cmd') : join(root, 'node_modules', '.bin', 'prisma');
const tsc = process.platform === 'win32' ? join(root, 'node_modules', '.bin', 'tsc.cmd') : join(root, 'node_modules', '.bin', 'tsc');
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://lukitas:lukitas@127.0.0.1:5433/lukitas?schema=public';
const schemaPath = join(root, 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');
if (!/^\s*model\s+User\s+/m.test(schema) || !/^\s*model\s+LedgerEntry\s+/m.test(schema)) {
  throw new Error('P0 Prisma schema is incomplete');
}

for (const args of [
  ['exec', 'prisma', 'validate', '--schema', 'prisma/schema.prisma'],
  ['exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'],
]) {
  const result = spawnSync(prisma, args.slice(2), { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, CI: '1', DATABASE_URL: databaseUrl }, });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `command failed: ${args.join(' ')}`);
  }
}

const port = 3217;
const buildDir = join(root, '.tmp-api-smoke');
rmSync(buildDir, { force: true, recursive: true });
const build = spawnSync(tsc, ['-p', 'tsconfig.json', '--outDir', buildDir, '--rootDir', '.'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, CI: '1' } });
if (build.status !== 0) {
  rmSync(buildDir, { force: true, recursive: true });
  throw new Error(build.stderr || build.stdout || 'API TypeScript build failed');
}
const child = spawn(process.execPath, [join(buildDir, 'src', 'main.js')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, CI: '1', PORT: String(port), DATABASE_URL: databaseUrl },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const buffers = { stdout: '', stderr: '' };
child.stdout.on('data', (chunk) => {
  buffers.stdout += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  buffers.stderr += chunk.toString();
});

const healthUrl = `http://127.0.0.1:${port}/health`;
const deadline = Date.now() + 60000;
const waitForClose = () => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    resolve();
    return;
  }

  child.once('close', resolve);
});

try {
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      break;
    }

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const payload = await response.json();
        if (payload.ok === true && payload.database === 'up') {
          console.log('api.smoke: pass');
          process.exitCode = 0;
          break;
        }
      }
    } catch {
      // keep waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (process.exitCode !== 0) {
    throw new Error(`API health check did not pass. stdout=${buffers.stdout}\nstderr=${buffers.stderr}`);
  }
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
  }
  await waitForClose();
  rmSync(buildDir, { force: true, recursive: true });
}
