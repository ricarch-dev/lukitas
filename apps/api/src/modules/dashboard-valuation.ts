import { parseDecimal } from '@lukitas/domain';
import type { DashboardComparison, DashboardDisplayCurrency, DashboardValuation } from '../../../../packages/contracts/src/dashboard.ts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
import type { PrismaService } from '../common/prisma.js';
import { addDecimal, asString, fixedAmount, monetaryUnit, multiplyDecimal } from './p0-finance.js';
import { previousBalanceCutoff } from './dashboard-timezone.js';

const displayCurrencies = ['VES', 'USD', 'EUR'] as const;

type Balance = { currency: SupportedMonetaryUnitCode; amount: string };
type Cutoff = { instant: Date; historical: boolean };

// Round the ratio once, after exact integer arithmetic; never coerce a balance to Number.
const percentage = (current: string, previous: string): string | null => {
  const before = parseDecimal(previous);
  if (before.coefficient === 0n) return null;
  const after = parseDecimal(current);
  const scale = Math.max(before.scale, after.scale);
  const beforeUnits = before.coefficient * 10n ** BigInt(scale - before.scale);
  const changeUnits = after.coefficient * 10n ** BigInt(scale - after.scale) - beforeUnits;
  const numerator = changeUnits * 10000n;
  const denominator = beforeUnits < 0n ? -beforeUnits : beforeUnits;
  const magnitude = numerator < 0n ? -numerator : numerator;
  const rounded = (magnitude + denominator / 2n) / denominator;
  const sign = (numerator < 0n) !== (beforeUnits < 0n) && rounded !== 0n ? '-' : '';
  return `${sign}${rounded / 100n}.${(rounded % 100n).toString().padStart(2, '0')}`;
};

export async function dashboardComparison(
  prisma: PrismaService,
  userId: string,
  timezone: string,
  clock: Date,
): Promise<DashboardComparison> {
  const previous = previousBalanceCutoff(clock, timezone);
  const accounts = await prisma.account.findMany({
    where: { userId, createdAt: { lt: clock } },
    select: { id: true, currencyCode: true, openingBalance: true, createdAt: true, archivedAt: true },
  });
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      account: { userId },
      transaction: { voidedAt: null, occurredAt: { lt: clock } },
    },
    select: { accountId: true, signedAmount: true, transaction: { select: { occurredAt: true } } },
  });
  const entriesByAccount = new Map<string, typeof entries>();
  for (const entry of entries) {
    const group = entriesByAccount.get(entry.accountId) ?? [];
    group.push(entry);
    entriesByAccount.set(entry.accountId, group);
  }
  const balancesAt = (cutoff: Cutoff): Balance[] => accounts
    .filter((account) => account.createdAt < cutoff.instant &&
      (!account.archivedAt || account.archivedAt >= cutoff.instant))
    .map((account) => ({
      currency: monetaryUnit(account.currencyCode).code,
      amount: (entriesByAccount.get(account.id) ?? [])
        .filter((entry) => entry.transaction.occurredAt < cutoff.instant)
        .reduce((sum, entry) => addDecimal(sum, asString(entry.signedAmount)),
          asString(account.openingBalance)),
    }));

  const value = async (balances: Balance[], currency: DashboardDisplayCurrency, cutoff: Cutoff): Promise<DashboardValuation> => {
    let amount = '0';
    const missing = new Set<SupportedMonetaryUnitCode>();
    const quotes: DashboardValuation['quotes'][number][] = [];
    const grouped = new Map<SupportedMonetaryUnitCode, string>();
    for (const balance of balances)
      grouped.set(balance.currency, addDecimal(grouped.get(balance.currency) ?? '0', balance.amount));
    for (const [source, balance] of grouped) {
      if (parseDecimal(balance).coefficient === 0n) continue;
      if (source === currency) {
        amount = addDecimal(amount, balance);
        continue;
      }
      const rate = await prisma.fxRate.findFirst({
        where: { baseCode: source, quoteCode: currency,
          effectiveAt: cutoff.historical ? { lt: cutoff.instant } : { lte: cutoff.instant } },
        orderBy: { effectiveAt: 'desc' },
      });
      if (!rate || parseDecimal(asString(rate.rate)).coefficient <= 0n) {
        missing.add(source);
        continue;
      }
      amount = addDecimal(amount, multiplyDecimal(balance, asString(rate.rate), monetaryUnit(currency).precision));
      quotes.push({ baseCurrency: source, effectiveAt: rate.effectiveAt.toISOString(), source: rate.source });
    }
    return {
      amount: fixedAmount(amount, monetaryUnit(currency).precision),
      partial: missing.size > 0,
      missingCurrencies: [...missing],
      quotes,
    };
  };
  const currentCutoff: Cutoff = { instant: clock, historical: false };
  const previousCutoff: Cutoff = { instant: previous, historical: true };
  const currentBalances = balancesAt(currentCutoff);
  const previousBalances = balancesAt(previousCutoff);
  const compare = async (currency: DashboardDisplayCurrency) => {
    const [current, prior] = await Promise.all([
      value(currentBalances, currency, currentCutoff),
      value(previousBalances, currency, previousCutoff),
    ]);
    return {
      current, previous: prior,
      percentChange: current.partial || prior.partial ? null : percentage(current.amount, prior.amount),
    };
  };
  const [ves, usd, eur] = await Promise.all(displayCurrencies.map(compare));
  return {
    currentCutoff: clock.toISOString(),
    previousCutoff: previous.toISOString(),
    openingBalanceDate: 'ACCOUNT_CREATED_AT_APPROXIMATION',
    valuations: { VES: ves, USD: usd, EUR: eur },
  };
}
