import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError, type SessionTokens } from '../src/api/client.ts';
import { submitAuth } from '../src/features/auth-submit.ts';

const credentials = { email: '  PERSON@Example.com ', password: 'password123' };
const tokens = { accessToken: 'access', refreshToken: 'refresh' };

function setup(status = 200, body: unknown = { user: { id: 'user', email: 'person@example.com', onboardingComplete: false }, ...tokens }) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const saved: SessionTokens[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  const client = new ApiClient({ baseUrl: 'http://localhost:3000/v1' });
  const session = { post: client.post.bind(client), setTokens: async (value: SessionTokens) => { saved.push(value); } };
  return { requests, saved, session, restore: () => { globalThis.fetch = previousFetch; } };
}

test('registration submits normalized credentials and persists tokens for onboarding', async () => {
  const context = setup();
  try {
    await submitAuth('register', credentials, context.session);
    assert.equal(context.requests[0]?.url, 'http://localhost:3000/v1/auth/register');
    assert.equal(context.requests[0]?.init.method, 'POST');
    assert.deepEqual(JSON.parse(String(context.requests[0]?.init.body)), {
      email: 'person@example.com', password: 'password123',
    });
    assert.deepEqual(context.saved, [tokens]);
  } finally { context.restore(); }
});

test('login still submits to the existing endpoint and accepts existing passwords', async () => {
  const context = setup();
  try {
    await submitAuth('login', { email: credentials.email, password: 'short' }, context.session);
    assert.equal(context.requests[0]?.url, 'http://localhost:3000/v1/auth/login');
    assert.equal(JSON.parse(String(context.requests[0]?.init.body)).password, 'short');
    assert.deepEqual(context.saved, [tokens]);
  } finally { context.restore(); }
});

test('invalid email and registration password never send or persist tokens', async () => {
  const context = setup();
  try {
    await assert.rejects(submitAuth('register', { email: 'invalid', password: 'password123' }, context.session), /valid email/);
    await assert.rejects(submitAuth('register', { email: credentials.email, password: 'short' }, context.session), /at least 8/);
    await assert.rejects(submitAuth('login', { email: credentials.email, password: '' }, context.session), /Password is required/);
    assert.deepEqual(context.requests, []);
    assert.deepEqual(context.saved, []);
  } finally { context.restore(); }
});

test('duplicate-account and HTTP failures leave session unchanged', async () => {
  for (const [status, code] of [[409, 'CONFLICT'], [500, 'HTTP_ERROR']] as const) {
    const context = setup(status, { code, message: 'Request failed' });
    try {
      await assert.rejects(submitAuth('register', credentials, context.session), (error: unknown) =>
        error instanceof ApiError && error.status === status && error.code === code);
      assert.equal(context.requests.length, 1);
      assert.deepEqual(context.saved, []);
    } finally { context.restore(); }
  }
});

test('malformed success never persists tokens', async () => {
  const context = setup(200, { user: {}, accessToken: '', refreshToken: 'refresh' });
  try {
    await assert.rejects(submitAuth('register', credentials, context.session), /Invalid authentication response/);
    assert.deepEqual(context.saved, []);
  } finally { context.restore(); }
});
