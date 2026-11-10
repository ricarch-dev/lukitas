import type { TransactionDto } from '@lukitas/contracts';

export type MovementSearchPage = { readonly items: TransactionDto[]; readonly hasMore: boolean };

export function appendSearchPage(
  current: MovementSearchPage | null,
  next: MovementSearchPage,
  requestedGeneration: number,
  currentGeneration: number,
): MovementSearchPage | null {
  if (requestedGeneration !== currentGeneration || !current) return current;
  return { items: [...current.items, ...next.items], hasMore: next.hasMore };
}
