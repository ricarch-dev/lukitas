import type { DashboardDto } from '@lukitas/contracts';

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
