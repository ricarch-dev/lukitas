import type { OnboardingRequest } from '@lukitas/contracts';
import { Currency, Money, getSupportedMonetaryUnit } from '@lukitas/domain';
import type { ApiClient } from '../api/client.ts';

export class OnboardingInputError extends Error {}

export async function submitOnboarding(
  name: string,
  balance: string,
  timezone: string,
  post: ApiClient['post'],
  idempotencyKey: string,
): Promise<void> {
  const accountName = name.trim();
  if (!accountName) throw new OnboardingInputError('Escribe un nombre para tu cuenta.');
  const unit = getSupportedMonetaryUnit('USD');
  let openingBalance: string;
  try {
    openingBalance = Money.of(Currency.of(unit.code, unit.precision), balance.trim().replace(',', '.')).amount;
  } catch {
    throw new OnboardingInputError('Ingresa un saldo válido con un máximo de 2 decimales.');
  }
  const request: OnboardingRequest = {
    baseCurrency: unit.code,
    accountCurrency: unit.code,
    timezone,
    accountName,
    openingBalance,
  };
  const result = await post<unknown>('/onboarding', request, idempotencyKey);
  if (typeof result !== 'object' || result === null || !('complete' in result) || result.complete !== true) {
    throw new OnboardingInputError('No se pudo confirmar la creación de tu cuenta. Intenta de nuevo.');
  }
}
