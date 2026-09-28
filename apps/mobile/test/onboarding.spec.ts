import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ApiClient } from '../src/api/client.ts';
import { submitOnboarding } from '../src/features/onboarding-submit.ts';
import { AUTH_COLORS } from '../src/features/auth-screen-theme.ts';

test('onboarding preserves USD payload, exact amounts, and retry identity', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(String(_url), 'http://127.0.0.1:3000/v1/onboarding');
    assert.equal(new Headers(init?.headers).get('idempotency-key'), 'attempt-1');
    assert.deepEqual(JSON.parse(String(init?.body)), {
      baseCurrency: 'USD', accountCurrency: 'USD', accountName: 'Efectivo',
      timezone: 'UTC', openingBalance: '12345678901234567890.25',
    });
    return Response.json({ complete: true });
  };
  try {
    const client = new ApiClient();
    await submitOnboarding(' Efectivo ', '12345678901234567890,25', 'UTC', client.post.bind(client), 'attempt-1');
  } finally { globalThis.fetch = original; }
});

test('invalid inputs never submit and unconfirmed or failed requests never complete', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Unexpected request'); };
  const client = new ApiClient();
  const submit = (name: string, amount: string) => submitOnboarding(name, amount, 'UTC', client.post.bind(client), 'retry');
  try {
    await assert.rejects(submit(' ', '0'), /nombre/);
    for (const amount of ['', 'abc', '1.001', '1,2,3']) await assert.rejects(submit('Banco', amount), /saldo válido/);
    for (const result of [null, {}, { complete: false }]) {
      globalThis.fetch = async () => Response.json(result);
      await assert.rejects(submit('Banco', '0'), /confirmar/);
    }
    globalThis.fetch = async () => { throw new TypeError('Offline'); };
    await assert.rejects(submit('Banco', '0'), /Offline/);
  } finally { globalThis.fetch = original; }
});

test('onboarding exposes labels, bounded layout, keyboard handling and confirmed navigation', () => {
  const screen = readFileSync(new URL('../src/features/onboarding-screen.tsx', import.meta.url), 'utf8');
  const navigator = readFileSync(new URL('../src/navigation/RootNavigator.tsx', import.meta.url), 'utf8');
  assert.match(screen, /maxWidth: 500/);
  assert.match(screen, /KeyboardAvoidingView/);
  assert.match(screen, /accessibilityLabel="Nombre de la cuenta"/);
  assert.match(screen, /accessibilityState=\{\{ busy, disabled: busy \}\}/);
  assert.match(screen, /if \(lock.current\) return/);
  assert.match(screen, /await submitOnboarding\([\s\S]*?onComplete\(\)/);
  assert.match(navigator, /onComplete=\{\(\) => setOnboarded\(true\)\}/);
});

test('onboarding text and lime action colors maintain readable contrast', () => {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((index) => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  };
  const pairs = [[AUTH_COLORS.ink, '#b8e83f'], [AUTH_COLORS.ink, '#a4d32e'],
    [AUTH_COLORS.ink, '#e1edc3'], [AUTH_COLORS.muted, '#f7f6fb'],
    [AUTH_COLORS.muted, AUTH_COLORS.surface]];
  for (const [text, surface] of pairs) {
    assert.ok((luminance(surface!) + 0.05) / (luminance(text!) + 0.05) >= 4.5);
  }
});
