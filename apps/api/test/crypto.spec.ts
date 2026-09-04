import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, signAccessToken, verifyAccessToken, verifyPassword } from '../src/common/crypto.ts';

test('auth crypto uses Argon2id hashes and jose-issued expiring JWTs', async () => {
  const passwordHash = await hashPassword('correct horse battery staple');
  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword('correct horse battery staple', passwordHash), true);
  assert.equal(await verifyPassword('incorrect', passwordHash), false);
  const token = await signAccessToken('user-1', true);
  assert.deepEqual(await verifyAccessToken(token), { sub: 'user-1', onboardingComplete: true });
  await assert.rejects(() => verifyAccessToken(`${token}x`));
});
