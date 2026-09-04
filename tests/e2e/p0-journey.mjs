import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.API_URL ?? 'http://127.0.0.1:3000/v1';
const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload;
};
const email = `e2e-${randomUUID()}@example.com`;
const auth = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'correct-horse-battery' }) });
const headers = { authorization: `Bearer ${auth.accessToken}` };
const setup = await request('/onboarding', { method: 'POST', headers: { ...headers, 'idempotency-key': randomUUID() }, body: JSON.stringify({ baseCurrency: 'USD', timezone: 'UTC', accountName: 'Checking', accountCurrency: 'USD', openingBalance: '100.00' }) });
const transaction = await request(`/accounts/${setup.accountId}/transactions`, { method: 'POST', headers: { ...headers, 'idempotency-key': randomUUID() }, body: JSON.stringify({ kind: 'INCOME', amount: '25.50', currencyCode: 'USD', note: 'E2E income' }) });
const dashboard = await request('/dashboard', { headers });
assert.equal(dashboard.accounts[0].balance, '125.50');
assert.equal(dashboard.recentActivity[0].id, transaction.id);
const refreshed = await request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: auth.refreshToken }) });
assert.ok(refreshed.accessToken);
console.log('p0 e2e: pass');
