import { fixedAmount, monetaryUnit, type StoredDecimal } from '../finance/amounts.js';

export type AccountView = {
  id: string;
  name: string;
  currency: { code: string; precision: number };
  openingBalance: StoredDecimal;
  archivedAt: Date | null;
  bankGroup?: { id: string; name: string } | null;
};

export const accountDto = (account: AccountView, balance: string) => {
  const unit = monetaryUnit(account.currency.code);
  return {
    id: account.id,
    name: account.name,
    currency: { code: unit.code, precision: unit.precision },
    openingBalance: fixedAmount(account.openingBalance, unit.precision),
    balance: fixedAmount(balance, unit.precision),
    archived: Boolean(account.archivedAt),
    bankGroup: account.bankGroup
      ? { id: account.bankGroup.id, name: account.bankGroup.name }
      : null,
  };
};
