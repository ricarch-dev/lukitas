import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pnpm = process.env.npm_execpath
  ? [process.execPath, process.env.npm_execpath]
  : process.platform === 'win32'
    ? ['pnpm.cmd']
    : ['pnpm'];
const schemaPath = join(root, 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

if (/^\s*model\s+/m.test(schema)) {
  throw new Error('schema.prisma must stay model-free');
}

if (existsSync(join(root, 'prisma', 'migrations'))) {
  throw new Error('prisma migrations must be absent in PR2');
}

for (const args of [
  ['exec', 'prisma', 'validate', '--schema', 'prisma/schema.prisma'],
  ['exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'],
]) {
  const result = spawnSync(pnpm[0], [...pnpm.slice(1), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' }, });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `command failed: ${args.join(' ')}`);
  }
}

const port = 3217;
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://lukitas:lukitas@127.0.0.1:5433/lukitas?schema=public';
const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
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
}
