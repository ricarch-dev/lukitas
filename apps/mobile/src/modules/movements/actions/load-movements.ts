import type { AccountDto, TransactionDto } from '@lukitas/contracts';
import type { ApiClient } from '../../../api/client';

export type MovementReport = { readonly items: TransactionDto[]; readonly baseCurrency: string; readonly timezone: string };
export type MovementCategory = { readonly id: string; readonly name: string };

export async function loadMovementsData(client: ApiClient, month: string) {
  const [report, accounts, optionalCategories] = await Promise.all([
    client.get<MovementReport>(`/reports?month=${encodeURIComponent(month)}`),
    client.get<AccountDto[]>('/accounts'),
    client.categories().then(
      (categories) => ({ categories, categoriesUnavailable: false }),
      () => ({ categories: [] as MovementCategory[], categoriesUnavailable: true }),
    ),
  ]);
  return { report, accounts, ...optionalCategories };
}
