import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const prisma =
  process.platform === 'win32'
    ? join(root, 'node_modules', '.bin', 'prisma.cmd')
    : join(root, 'node_modules', '.bin', 'prisma');
const tsc =
  process.platform === 'win32'
    ? join(root, 'node_modules', '.bin', 'tsc.cmd')
    : join(root, 'node_modules', '.bin', 'tsc');
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://lukitas:lukitas@127.0.0.1:5433/lukitas?schema=public';
const schemaPath = join(root, 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');
if (!/^\s*model\s+User\s+/m.test(schema) || !/^\s*model\s+LedgerEntry\s+/m.test(schema)) {
  throw new Error('P0 Prisma schema is incomplete');
}

for (const args of [
  ['exec', 'prisma', 'validate', '--schema', 'prisma/schema.prisma'],
  ['exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'],
]) {
  const result = spawnSync(prisma, args.slice(2), {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1', DATABASE_URL: databaseUrl },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `command failed: ${args.join(' ')}`);
  }
}

const port = 3217;
const buildDir = mkdtempSync(join(root, '.tmp-api-smoke-'));
const build = spawnSync(tsc, ['-p', 'tsconfig.json', '--outDir', buildDir], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env, CI: '1' },
});
if (build.status !== 0) {
  rmSync(buildDir, { force: true, recursive: true });
  throw new Error(build.stderr || build.stdout || 'API TypeScript build failed');
}
const child = spawn(process.execPath, [join(buildDir, 'apps', 'api', 'src', 'main.js')], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, CI: '1', NODE_ENV: 'development', PORT: String(port), DATABASE_URL: databaseUrl },
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
const startupLines = [
  `API listening at http://localhost:${port}/v1`,
  `Health check: http://localhost:${port}/health (checks database on request)`,
];
const privateQuery = 'private_query_marker';
const privateSegment = 'private_unknown_segment';
const responseLog = (method, route, status) =>
  new RegExp(`^api\\.response ${method} ${route} ${status} (?:\\d+(?:\\.\\d+)?)ms$`, 'm');
const deadline = Date.now() + 60000;
const waitForClose = () =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once('close', resolve);
  });

try {
  let healthPassed = false;
  let responsesChecked = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      break;
    }

    if (!healthPassed) {
      try {
        const response = await fetch(`${healthUrl}?probe=${privateQuery}&token=fake_access_token&password=fake_password`);
        if (response.ok) {
          const payload = await response.json();
          healthPassed = payload.ok === true && payload.database === 'up';
        }
      } catch {
        // keep waiting
      }
    }

    if (
      healthPassed &&
      !responsesChecked &&
      startupLines.every((line) => buffers.stdout.split(/\r?\n/).includes(line))
    ) {
      const unauthorized = await fetch(`http://127.0.0.1:${port}/v1/auth/me`);
      const missing = await fetch(`http://127.0.0.1:${port}/${privateSegment}?probe=${privateQuery}`);
      if (unauthorized.status !== 401 || missing.status !== 404) {
        throw new Error(`Unexpected HTTP statuses: protected=${unauthorized.status}, missing=${missing.status}`);
      }
      responsesChecked = true;
    }

    if (
      responsesChecked &&
      responseLog('GET', '/health', 200).test(buffers.stdout) &&
      responseLog('GET', '/v1/auth/me', 401).test(buffers.stdout) &&
      responseLog('GET', '<unmatched>', 404).test(buffers.stdout)
    ) {
      const lines = buffers.stdout.split(/\r?\n/).filter((line) => line.startsWith('api.response '));
      if (
        lines.some((line) =>
          [privateQuery, privateSegment, 'fake_access_token', 'fake_password', '?'].some((secret) =>
            line.includes(secret),
          ),
        )
      ) {
        throw new Error('Sensitive request content was included in response telemetry');
      }
      for (const line of startupLines) console.log(`api.smoke child stdout: ${line}`);
      for (const line of lines) console.log(`api.smoke child stdout: ${line}`);
      console.log('api.smoke: pass');
      process.exitCode = 0;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (process.exitCode !== 0) {
    throw new Error(
      `API health check did not pass. stdout=${buffers.stdout}\nstderr=${buffers.stderr}`,
    );
  }

  child.kill('SIGTERM');
  await waitForClose();
  const production = spawn(process.execPath, [join(buildDir, 'apps', 'api', 'src', 'main.js')], {
    cwd: root,
    env: { ...process.env, CI: '1', NODE_ENV: 'production', PORT: String(port), DATABASE_URL: databaseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let productionStdout = '';
  production.stdout.on('data', (chunk) => {
    productionStdout += chunk.toString();
  });
  try {
    let productionResponded = false;
    const productionDeadline = Date.now() + 15000;
    while (Date.now() < productionDeadline && !productionResponded) {
      if (production.exitCode !== null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/v1/auth/me`);
        productionResponded = response.status === 401;
      } catch {
        // The isolated child may not be listening yet.
      }
      if (!productionResponded) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!productionResponded || productionStdout.includes('api.response ')) {
      throw new Error('Production response telemetry was emitted or the isolated API did not respond');
    }
    console.log('api.smoke production telemetry: disabled');
  } finally {
    if (production.exitCode === null && production.signalCode === null) production.kill('SIGTERM');
    if (production.exitCode === null && production.signalCode === null) {
      await new Promise((resolve) => production.once('close', resolve));
    }
  }
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
  }
  await waitForClose();
  rmSync(buildDir, { force: true, recursive: true });
}
