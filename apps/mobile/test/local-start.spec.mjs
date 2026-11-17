import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLocalApi, expoArguments, startLocal } from '../scripts/start-local.mjs';

test('both launch modes preserve Expo Go, web, port and forwarded options', () => {
  assert.deepEqual(expoArguments('native', ['--clear']), [
    'start',
    '--go',
    '--lan',
    '--port',
    '19006',
    '--clear',
  ]);
  assert.deepEqual(expoArguments('web', []), ['start', '--web', '--port', '19006']);
  assert.throws(() => expoArguments('invalid', []), /native or web/);
});

test('startup checks API and database health before opening Expo', async () => {
  const calls = [];
  await checkLocalApi(undefined, async (url, options) => {
    calls.push([url, options.redirect, options.signal instanceof AbortSignal]);
    return Response.json({ ok: true, database: 'up' });
  });
  assert.deepEqual(calls, [['http://127.0.0.1:3000/health', 'error', true]]);
  await checkLocalApi('http://localhost:3217/v1', async (url) => {
    assert.equal(url, 'http://localhost:3217/health');
    return Response.json({ ok: true, database: 'up' });
  });
});

test('unreachable or unhealthy API fails with an actionable error, not a login failure', async () => {
  for (const response of [
    () => Promise.reject(new TypeError('fetch failed')),
    async () => Response.json({ ok: false, database: 'down' }, { status: 503 }),
    async () => Response.json({ ok: true, database: 'down' }),
    async () => new Response('not the API'),
  ]) {
    await assert.rejects(checkLocalApi(undefined, response), /pnpm --dir apps\/api start/);
  }
});

test('a failed preflight never launches Expo; help remains available without the backend', async () => {
  const launches = [];
  const options = {
    env: {},
    check: async () => {
      throw new Error('API unavailable');
    },
    launch: async (args) => {
      launches.push(args);
    },
    log: () => {},
  };
  await assert.rejects(startLocal('native', [], options), /API unavailable/);
  assert.deepEqual(launches, []);
  await startLocal('web', ['--help'], options);
  assert.deepEqual(launches, [['start', '--web', '--port', '19006', '--help']]);
});

test('a successful preflight forwards the explicit URL and starts Expo once', async () => {
  const calls = [];
  await startLocal('native', ['--clear'], {
    env: { EXPO_PUBLIC_API_URL: 'http://localhost:3217/v1' },
    check: async (url) => {
      calls.push(url);
    },
    launch: async (args) => {
      calls.push(args);
    },
    log: () => {},
  });
  assert.deepEqual(calls, [
    'http://localhost:3217/v1',
    ['start', '--go', '--lan', '--port', '19006', '--clear'],
  ]);
});

test('default local startup selects discovery before Expo can load a saved dotenv IP', async () => {
  const env = { OTHER_SETTING: 'preserved' };
  await startLocal('native', [], {
    env,
    check: async (url) => {
      assert.equal(url, undefined);
    },
    launch: async () => {
      assert.deepEqual(env, { OTHER_SETTING: 'preserved', EXPO_PUBLIC_API_URL: 'auto' });
    },
    log: () => {},
  });
});

test('malformed health URL never invokes the request', async () => {
  await assert.rejects(
    checkLocalApi('not a URL', async () => {
      assert.fail('must not request a malformed URL');
    }),
    {
      message:
        'API health check failed. Start the backend in another terminal: pnpm --dir apps/api start. If already running, check EXPO_PUBLIC_API_URL and /health. No database files were changed.',
    },
  );
});
