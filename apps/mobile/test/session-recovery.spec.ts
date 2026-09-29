import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { clearSessionForLogin } from '../src/navigation/session-recovery.ts';
import { createSessionStorage } from '../src/session/storage-core.ts';

test('session recovery clears only tokens and leaves other device data untouched', async () => {
  const values = new Map<string, string>([['unrelated.user.data', 'keep me']]);
  const removed: string[] = [];
  const storage = createSessionStorage({
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { removed.push(key); values.delete(key); },
  });
  await storage.write({ accessToken: 'expired', refreshToken: 'rejected' });
  await clearSessionForLogin(tokens => storage.write(tokens));
  assert.deepEqual(removed, ['lukitas.session.v1']);
  assert.equal(await storage.read(), null);
  assert.equal(values.get('unrelated.user.data'), 'keep me');
});

test('root error gate retains retry and exposes accessible token-clear recovery', () => {
  const navigator = readFileSync(fileURLToPath(new URL('../src/navigation/RootNavigator.tsx', import.meta.url)), 'utf8');
  assert.match(navigator, /onPress=\{\(\) => setRetry\(value => value \+ 1\)\}/);
  assert.match(navigator, /accessibilityRole="button" accessibilityHint="[^"]+" onPress=\{\(\) => void clearSessionForLogin\(setTokens\)\}/);
  assert.match(navigator, /Volver a iniciar sesión/);
  assert.match(navigator, /<OnboardingScreen onComplete=/);
});
