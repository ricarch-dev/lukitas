import type { MoneyDto } from './money.ts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
export interface AccountDto {
  readonly id: string;
  readonly name: string;
  readonly currency: MoneyDto['currency'];
  readonly openingBalance: string;
  readonly balance: string;
  readonly archived: boolean;
  readonly bankGroup: { readonly id: string; readonly name: string } | null;
}
export interface CreateAccountRequest {
  readonly name: string;
  readonly currencyCode: SupportedMonetaryUnitCode;
  readonly openingBalance: string;
  readonly bankName?: string;
  readonly bankGroupId?: string;
}
