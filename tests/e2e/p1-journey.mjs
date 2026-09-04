import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.API_URL ?? 'http://127.0.0.1:3000/v1';
const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload;
};
const email = `p1-${randomUUID()}@example.com`;
const auth = await request('/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password: 'correct-horse-battery' }),
});
const headers = { authorization: `Bearer ${auth.accessToken}` };
const setup = await request('/onboarding', {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': randomUUID() },
  body: JSON.stringify({
    baseCurrency: 'USD',
    timezone: 'UTC',
    accountName: 'Checking',
    accountCurrency: 'USD',
    openingBalance: '100.00',
  }),
});
const category = await request('/categories', {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': randomUUID() },
  body: JSON.stringify({ name: 'Food' }),
});
const transaction = await request(`/accounts/${setup.accountId}/transactions`, {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': randomUUID() },
  body: JSON.stringify({
    kind: 'EXPENSE',
    amount: '25.00',
    currencyCode: 'USD',
    categoryId: category.id,
    note: 'P1 expense',
  }),
});
assert.equal(transaction.categoryId, category.id);
const month = new Date().toISOString().slice(0, 7);
const budget = await request('/budgets', {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': randomUUID() },
  body: JSON.stringify({ categoryId: category.id, month, limit: '200.00' }),
});
assert.equal(budget.spent, '25.00');
const report = await request(`/reports?month=${month}&categoryId=${category.id}&kind=EXPENSE`, {
  headers,
});
assert.equal(report.items.length, 1);
const startAt = new Date(Date.now() - 2 * 86400000).toISOString();
const rule = await request('/recurring-rules', {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': randomUUID() },
  body: JSON.stringify({
    accountId: setup.accountId,
    categoryId: category.id,
    kind: 'EXPENSE',
    amount: '3.00',
    currencyCode: 'USD',
    cadence: 'DAILY',
    timezone: 'UTC',
    startAt,
  }),
});
const catchupKey = randomUUID();
const catchupBody = { until: new Date().toISOString() };
const catchup = await request(`/recurring-rules/${rule.id}/catch-up`, {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': catchupKey },
  body: JSON.stringify(catchupBody),
});
assert.ok(catchup.created.length >= 2);
const retry = await request(`/recurring-rules/${rule.id}/catch-up`, {
  method: 'POST',
  headers: { ...headers, 'idempotency-key': catchupKey },
  body: JSON.stringify(catchupBody),
});
assert.deepEqual(retry, catchup);
console.log('p1 e2e: pass');
