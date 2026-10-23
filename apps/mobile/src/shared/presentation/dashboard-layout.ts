import type { AccountDto, DashboardDto } from '@lukitas/contracts';

export function homeDashboardLayout(windowWidth: number) {
  const wide = windowWidth >= 720;
  const gutter = windowWidth >= 720 ? 32 : 20;
  return {
    wide,
    gutter,
    contentWidth: Math.min(Math.max(0, windowWidth - gutter * 2), 1120),
  };
}

export function activeDashboardAccounts(dashboard: DashboardDto) {
  return dashboard.accounts.filter((account) => !account.archived);
}

export function groupedDashboardAccounts(accounts: readonly AccountDto[]) {
  const groups: { id: string; name: string | null; accounts: AccountDto[] }[] = [];
  for (const account of accounts) {
    const id = account.bankGroup?.id ?? account.id;
    let group = groups.find((item) => item.id === id);
    if (!group) {
      group = { id, name: account.bankGroup?.name ?? null, accounts: [] };
      groups.push(group);
    }
    group.accounts.push(account);
  }
  for (const group of groups) {
    group.accounts.sort((left, right) =>
      (left.currency.code === 'VES' ? 0 : left.currency.code === 'USD' ? 1 : 2) -
      (right.currency.code === 'VES' ? 0 : right.currency.code === 'USD' ? 1 : 2),
    );
  }
  return groups;
}
