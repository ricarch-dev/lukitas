import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIONAL_ACCOUNTS,
  INTERNATIONAL_ACCOUNTS,
} from '../src/modules/accounts/presentation/account-catalog.ts';
import {
  createSelectedAccount,
  primaryAccountFingerprint,
} from '../src/modules/accounts/actions/create-selected-account.ts';
import {
  applyAmountKey,
  amountDigits,
  formatAccountAmount,
  amountFromDigits,
} from '../src/modules/accounts/presentation/account-amount.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const component = () =>
  readFileSync(
    join(import.meta.dirname, '../src/modules/accounts/components/account-form-card.tsx'),
    'utf8',
  );
const screen = () =>
  readFileSync(
    join(import.meta.dirname, '../src/modules/accounts/screens/create-account-screen.tsx'),
    'utf8',
  );

test('amount keypad edits exact cents without parsing a localized number', () => {
  let digits = amountDigits('0');
  for (const key of ['1', '2', '3', '4', '5']) digits = applyAmountKey(digits, key);
  assert.equal(amountFromDigits(digits), '123.45');
  assert.equal(formatAccountAmount('1234.56', 'VES'), '1.234,56');
  assert.equal(formatAccountAmount('1234.56', 'USD'), '1,234.56');
  assert.equal(amountFromDigits(applyAmountKey(digits, 'backspace')), '12.34');
  assert.equal(amountFromDigits(applyAmountKey(digits, 'clear')), '0.00');
  assert.equal(amountFromDigits(applyAmountKey(amountDigits('12,50'), '00')), '1250.00');
});

test('account creation uses accessible picker and amount sheets without adding nonfunctional fields', () => {
  const form = component();
  const picker = readFileSync(
    join(import.meta.dirname, '../src/modules/accounts/components/account-picker-sheet.tsx'),
    'utf8',
  );
  const amount = readFileSync(
    join(import.meta.dirname, '../src/modules/accounts/components/account-amount-sheet.tsx'),
    'utf8',
  );
  const sheet = readFileSync(
    join(import.meta.dirname, '../src/modules/accounts/components/account-sheet.tsx'),
    'utf8',
  );
  assert.match(picker, /Buscar (?:banco|billetera)/);
  assert.match(picker, /accessibilityRole="radiogroup"/);
  assert.match(sheet, /onRequestClose=/);
  assert.match(amount, /applyAmountKey/);
  assert.match(form, /Saldo en Bs/);
  assert.match(form, /Saldo inicial/);
  assert.match(form, /Etiqueta \(opcional\)/);
  assert.doesNotMatch(form, />\s*(?:COLOR|ICONO|límite de 5 cuentas)\s*</);
  assert.match(form, /<AccountPickerSheet/);
  assert.match(form, /<AccountAmountSheet/);
  assert.match(
    screen(),
    /<AccountFormCard\s+form=\{form\}\s+onChange=\{changeForm\}\s+disabled=\{busy \|\| loading \|\| retryPending\}\s*\/>/,
  );
  assert.match(screen(), /disabled=\{busy \|\| loading \|\| loadError \|\| !form\.provider\}/);
});

test('account catalogs contain the requested choices with stable bank codes', () => {
  assert.equal(NATIONAL_ACCOUNTS.length, 26);
  assert.deepEqual(NATIONAL_ACCOUNTS[0], { code: '0102', name: 'Banco de Venezuela' });
  assert.deepEqual(NATIONAL_ACCOUNTS.at(-1), { code: '0191', name: 'Banco Nacional de Crédito' });
  assert.deepEqual(INTERNATIONAL_ACCOUNTS, [
    'airTM',
    'Bank Of America',
    'Binance',
    'Facebank',
    'Kontigo',
    'Meru',
    'OKX',
    'paypal',
    'Revolut',
    'Wally',
    'Wise',
    'Zinli',
    'Bybit',
  ]);
});

test('national account creates separate VES and USD balances in one bank group', async () => {
  const sent = [];
  const post = async (_path, body, key) => {
    sent.push({ body, key });
    return { id: `account-${sent.length}`, bankGroup: { id: 'group-1', name: 'Banesco' } };
  };
  await createSelectedAccount(
    {
      region: 'national',
      provider: 'Banesco',
      label: 'Ahorros',
      balance: '12,50',
      hasUsd: true,
      usdBalance: '3.25',
    },
    [],
    post,
    'attempt-1',
  );
  assert.deepEqual(sent, [
    {
      body: { name: 'Ahorros', currencyCode: 'VES', openingBalance: '12.50', bankName: 'Banesco' },
      key: 'attempt-1-primary',
    },
    {
      body: {
        name: 'Ahorros',
        currencyCode: 'USD',
        openingBalance: '3.25',
        bankGroupId: 'group-1',
      },
      key: 'attempt-1-usd',
    },
  ]);
});

test('international account defaults to USD and optional label defaults to provider', async () => {
  const sent = [];
  await createSelectedAccount(
    {
      region: 'international',
      provider: 'Wise',
      label: '',
      balance: '4',
      hasUsd: false,
      usdBalance: '',
    },
    [],
    async (_path, body) => {
      sent.push(body);
      return { id: 'account-1' };
    },
    'attempt-2',
  );
  assert.deepEqual(sent, [
    { name: 'Wise', currencyCode: 'USD', openingBalance: '4.00', bankName: 'Wise' },
  ]);
});

test('existing bank groups are reused and a disabled USD switch creates only VES', async () => {
  const sent = [];
  await createSelectedAccount(
    {
      region: 'national',
      provider: 'Banesco',
      label: '',
      balance: '1',
      hasUsd: false,
      usdBalance: 'invalid',
    },
    [{ id: 'bank-1', name: 'BANESCO' }],
    async (_path, body) => {
      sent.push(body);
      return { id: 'account-1', bankGroup: { id: 'bank-1', name: 'BANESCO' } };
    },
    'attempt-5',
  );
  assert.deepEqual(sent, [
    { name: 'Banesco', currencyCode: 'VES', openingBalance: '1.00', bankGroupId: 'bank-1' },
  ]);
});

test('invalid extra USD balance rejects before creating the VES account', async () => {
  let posts = 0;
  await assert.rejects(
    createSelectedAccount(
      {
        region: 'national',
        provider: 'Banesco',
        label: '',
        balance: '1',
        hasUsd: true,
        usdBalance: '-1',
      },
      [],
      async () => {
        posts += 1;
      },
      'attempt-3',
    ),
  );
  assert.equal(posts, 0);
});

test('retry after the USD request fails retains the same keys and does not duplicate VES', async () => {
  const accounts = new Map();
  let fail = true;
  const post = async (_path, body, key) => {
    if (key.endsWith('-usd') && fail) {
      fail = false;
      throw new Error('offline');
    }
    if (!accounts.has(key))
      accounts.set(key, { id: key, bankGroup: { id: 'group-1', name: 'Banesco' }, body });
    return accounts.get(key);
  };
  const input = {
    region: 'national',
    provider: 'Banesco',
    label: '',
    balance: '1',
    hasUsd: true,
    usdBalance: '2',
  };
  await assert.rejects(createSelectedAccount(input, [], post, 'attempt-4'));
  await createSelectedAccount(input, [], post, 'attempt-4');
  assert.equal(accounts.size, 2);
});

test('editing the secondary balance does not change the primary idempotency identity', () => {
  const first = {
    region: 'national',
    provider: 'Banesco',
    label: 'Ahorros',
    balance: '12,50',
    hasUsd: true,
    usdBalance: '2',
  };
  assert.equal(
    primaryAccountFingerprint(first),
    primaryAccountFingerprint({ ...first, usdBalance: '3' }),
  );
  assert.equal(
    primaryAccountFingerprint(first),
    primaryAccountFingerprint({ ...first, hasUsd: false }),
  );
  assert.notEqual(
    primaryAccountFingerprint(first),
    primaryAccountFingerprint({ ...first, balance: '13' }),
  );
});

test('editing USD after a partial failure cannot duplicate the VES account with the primary key', async () => {
  const saved = new Map();
  let failUsd = true;
  const post = async (_path, body, key) => {
    if (key.endsWith('-usd') && failUsd) {
      failUsd = false;
      throw new Error('offline');
    }
    if (!saved.has(key))
      saved.set(key, { id: key, bankGroup: { id: 'bank-1', name: 'Banesco' }, body });
    return saved.get(key);
  };
  const first = {
    region: 'national',
    provider: 'Banesco',
    label: '',
    balance: '100',
    hasUsd: true,
    usdBalance: '2',
  };
  const key = primaryAccountFingerprint(first);
  await assert.rejects(createSelectedAccount(first, [], post, key));
  await createSelectedAccount(
    { ...first, usdBalance: '3' },
    [],
    post,
    primaryAccountFingerprint({ ...first, usdBalance: '3' }),
  );
  assert.deepEqual(
    [...saved.values()].map(({ body }) => [body.currencyCode, body.openingBalance]),
    [
      ['VES', '100.00'],
      ['USD', '3.00'],
    ],
  );
});
