import type { AccountDto } from '@lukitas/contracts';
import type { ApiClient } from '../../../api/client.ts';
import { AccountInputError, prepareAccountInput, submitAccount } from './create-account-submit.ts';
import { INTERNATIONAL_ACCOUNTS, NATIONAL_ACCOUNTS } from '../presentation/account-catalog.ts';

export type AccountForm = {
  region: 'national' | 'international';
  provider: string;
  label: string;
  balance: string;
  hasUsd: boolean;
  usdBalance: string;
};

// The primary write must keep its idempotency key even when the secondary balance changes.
export function primaryAccountFingerprint(form: AccountForm): string {
  return JSON.stringify({
    region: form.region,
    provider: form.provider,
    label: form.label.trim(),
    balance: form.balance.trim().replace(',', '.'),
  });
}

export async function createSelectedAccount(
  form: AccountForm,
  banks: NonNullable<AccountDto['bankGroup']>[],
  post: ApiClient['post'],
  attemptKey: string,
): Promise<void> {
  const valid = form.region === 'national'
    ? NATIONAL_ACCOUNTS.some((bank) => bank.name === form.provider)
    : INTERNATIONAL_ACCOUNTS.some((provider) => provider === form.provider);
  if (!valid) throw new AccountInputError('Elige una cuenta de la lista.');

  const name = form.label.trim() || form.provider;
  const group = banks.find((bank) => bank.name.toLocaleLowerCase() === form.provider.toLocaleLowerCase());
  const bank = group ? { bankGroupId: group.id } : { bankName: form.provider };
  const currencyCode = form.region === 'national' ? 'VES' : 'USD';
  const primary = { name, balance: form.balance, currencyCode, ...bank } as const;
  prepareAccountInput(primary);
  if (form.region === 'national' && form.hasUsd)
    prepareAccountInput({ name, balance: form.usdBalance, currencyCode: 'USD' });

  const first = await submitAccount(primary, post, `${attemptKey}-primary`);
  if (form.region === 'national' && form.hasUsd) {
    if (!first.bankGroup) throw new AccountInputError('No pudimos asociar el saldo en dólares. Intenta de nuevo.');
    await submitAccount(
      { name, balance: form.usdBalance, currencyCode: 'USD', bankGroupId: first.bankGroup.id },
      post,
      `${attemptKey}-usd`,
    );
  }
}
