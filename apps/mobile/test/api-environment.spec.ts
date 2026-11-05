import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiClient } from '../src/api/client.ts';

test('API requests use the configured phone-reachable URL and preserve caller overrides', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return new Response('{}', { status: 200 });
  };
  try {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000/v1';
    await new ApiClient().post('/auth/login', { email: 'test@example.com', password: 'test' });
    assert.equal(requests.at(-1), 'http://192.0.2.10:3000/v1/auth/login');
    await new ApiClient({ baseUrl: 'http://localhost:3217/v1' }).get('/accounts');
    assert.equal(requests.at(-1), 'http://localhost:3217/v1/accounts');
    delete process.env.EXPO_PUBLIC_API_URL;
    await new ApiClient().get('/accounts');
    assert.equal(requests.at(-1), 'http://127.0.0.1:3000/v1/accounts');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('configured API URL applies to token refresh and retried requests', async () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  const saved: Array<{ accessToken: string; refreshToken: string }> = [];
  const next = { accessToken: 'fixture-next', refreshToken: 'fixture-refresh' };
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.10:3000/v1';
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    if (requests.length === 1) return new Response('{}', { status: 401 });
    return Response.json(requests.length === 2 ? next : []);
  };
  try {
    const result = await new ApiClient({
      getTokens: () => ({ accessToken: 'fixture-old', refreshToken: 'fixture-refresh' }),
      setTokens: (tokens) => { if (tokens) saved.push(tokens); },
    }).get('/accounts');
    assert.deepEqual(requests, [
      'http://192.0.2.10:3000/v1/accounts',
      'http://192.0.2.10:3000/v1/auth/refresh',
      'http://192.0.2.10:3000/v1/accounts',
    ]);
    assert.deepEqual(saved, [next]);
    assert.deepEqual(result, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});
