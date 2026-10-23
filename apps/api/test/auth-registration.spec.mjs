import test from 'node:test';
import assert from 'node:assert/strict';
import 'reflect-metadata';
import 'tsx/esm';
import { verifyAccessToken } from '../src/common/crypto.ts';
const { AuthController, AuthService } = await import('../src/modules/auth/auth.ts');

function registrationHarness({ failAccount = false } = {}) {
  const state = { users: [], accounts: [], preferences: [], sessions: [], currencies: [] };
  const prisma = {
    $transaction: async (operation) => {
      const before = {
        users: state.users.length,
        accounts: state.accounts.length,
        preferences: state.preferences.length,
        currencies: state.currencies.length,
      };
      try {
        return await operation(prisma);
      } catch (error) {
        state.users.length = before.users;
        state.accounts.length = before.accounts;
        state.preferences.length = before.preferences;
        state.currencies.length = before.currencies;
        throw error;
      }
    },
    user: {
      findUnique: async ({ where }) => state.users.find((user) => user.email === where.email) ?? null,
      create: async ({ data }) => {
        if (failAccount) throw new Error('Account creation failed');
        const user = { id: 'new-user', email: data.email, passwordHash: data.passwordHash };
        state.users.push(user);
        if (data.accounts?.create)
          state.accounts.push({ ...data.accounts.create, userId: user.id });
        if (data.preferences?.create)
          state.preferences.push({ ...data.preferences.create, userId: user.id });
        return user;
      },
    },
    currency: {
      upsert: async ({ create }) => { state.currencies.push(create); },
    },
    userPreferences: {
      findUnique: async ({ where }) => state.preferences.find((p) => p.userId === where.userId) ?? null,
    },
    refreshSession: {
      create: async ({ data }) => { state.sessions.push(data); },
    },
  };
  return { state, controller: new AuthController(new AuthService(prisma)) };
}

test('registration with only email and password creates a zero-balance Efectivo account and opens the app', async () => {
  const { state, controller } = registrationHarness();
  const result = await controller.register({ email: 'New@Example.com', password: 'secret123' });

  assert.equal(result.user.email, 'new@example.com');
  assert.equal(result.user.onboardingComplete, true);
  assert.equal((await verifyAccessToken(result.accessToken)).onboardingComplete, true);
  assert.deepEqual(state.accounts, [{ userId: result.user.id, name: 'Efectivo', currencyCode: 'USD', openingBalance: '0' }]);
  assert.deepEqual(state.preferences, [{ userId: result.user.id, baseCurrency: 'USD', timezone: 'UTC', onboardingComplete: true }]);
  assert.equal(state.currencies.length, 1);
  assert.equal(state.currencies[0].code, 'USD');
  assert.equal(state.sessions.length, 1);
  assert.ok(result.refreshToken);
});

test('failed account creation does not leave a user or authentication session', async () => {
  const { state, controller } = registrationHarness({ failAccount: true });
  await assert.rejects(controller.register({ email: 'new@example.com', password: 'secret123' }), /Account creation failed/);
  assert.equal(state.users.length, 0);
  assert.equal(state.accounts.length, 0);
  assert.equal(state.currencies.length, 0);
  assert.equal(state.sessions.length, 0);
});

test('duplicate email still refuses registration without another account', async () => {
  const { state, controller } = registrationHarness();
  await controller.register({ email: 'new@example.com', password: 'secret123' });
  await assert.rejects(
    controller.register({ email: 'NEW@example.com', password: 'secret123' }),
    (error) => error.getStatus() === 409,
  );
  assert.equal(state.accounts.length, 1);
  assert.equal(state.sessions.length, 1);
});
