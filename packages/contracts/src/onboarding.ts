export interface OnboardingRequest {
  readonly baseCurrency: string;
  readonly timezone: string;
  readonly accountName: string;
  readonly accountCurrency: string;
  readonly openingBalance: string;
}
export interface OnboardingResponse {
  readonly complete: boolean;
  readonly baseCurrency: string;
  readonly timezone: string;
  readonly accountId: string;
}
