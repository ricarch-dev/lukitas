import type { SupportedMonetaryUnitCode } from '@lukitas/domain';

export interface OnboardingRequest {
  readonly baseCurrency: SupportedMonetaryUnitCode;
  readonly timezone: string;
  readonly accountName: string;
  readonly accountCurrency: SupportedMonetaryUnitCode;
  readonly openingBalance: string;
}
export interface OnboardingResponse {
  readonly complete: boolean;
  readonly baseCurrency: SupportedMonetaryUnitCode;
  readonly timezone: string;
  readonly accountId: string;
}
