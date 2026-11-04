import { Controller, Get, Injectable, Query, Req, UseGuards } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { validation } from '../../common/errors.js';
import { record } from '../../common/request-input.js';
import { dashboardPeriod } from '../dashboard/dashboard-timezone.js';
import { validatedMonthBounds } from '../planning/planning-time.js';
import { add, asString, currencyDefaults, fixed } from '../planning/planning-support.js';
import { transactionDto } from '../finance/amounts.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, rawQuery: unknown) {
    const query = record(rawQuery);
    const skip = query.skip === undefined ? 0 : Number(query.skip);
    if (!Number.isSafeInteger(skip) || skip < 0 || skip > 10000)
      validation('Invalid search offset');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100) validation('Invalid search text');
    if (query.kind !== undefined && query.kind !== 'INCOME' && query.kind !== 'EXPENSE')
      validation('Invalid movement kind');
    if (
      query.categoryId !== undefined &&
      (typeof query.categoryId !== 'string' || !query.categoryId)
    )
      validation('Invalid category');
    const term = search.trim();
    const searchedKind = term.toUpperCase();
    const period = /^\d{4}-\d{2}(?:-\d{2})?$/.test(term)
      ? new Date(`${term}${term.length === 7 ? '-01' : ''}T00:00:00Z`)
      : null;
    const periodEnd =
      period && Number.isFinite(period.getTime())
        ? new Date(
            Date.UTC(
              period.getUTCFullYear(),
              period.getUTCMonth() + (term.length === 7 ? 1 : 0),
              period.getUTCDate() + (term.length === 10 ? 1 : 0),
            ),
          )
        : null;
    const matches: Prisma.TransactionWhereInput[] = [
      { note: { contains: term, mode: 'insensitive' } },
      { currencyCode: { contains: term, mode: 'insensitive' } },
    ];
    if (/^\d{1,12}(?:\.\d{1,8})?$/.test(term)) matches.push({ amount: term });
    if (searchedKind === 'INCOME' || searchedKind === 'EXPENSE' || searchedKind === 'OPENING')
      matches.push({ kind: searchedKind });
    if (period && periodEnd) matches.push({ occurredAt: { gte: period, lt: periodEnd } });
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        voidedAt: null,
        ...(term ? { OR: matches } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip,
      take: 101,
    });
    return {
      items: transactions.slice(0, 100).map((transaction) => ({
        ...transactionDto(transaction),
        transferId: transaction.transferId ?? undefined,
      })),
      hasMore: transactions.length > 100,
    };
  }

  async get(userId: string, rawQuery: unknown) {
    const query = record(rawQuery);
    const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) validation('Onboarding is required');
    const { from, to } =
      typeof query.from === 'string' && typeof query.to === 'string'
        ? dashboardPeriod(prefs.timezone, query.from, query.to)
        : query.month
          ? validatedMonthBounds(String(query.month), prefs.timezone)
          : dashboardPeriod(prefs.timezone);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to)
      validation('Report period is invalid');
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: from, lt: to },
        voidedAt: null,
        ...(typeof query.accountId === 'string' ? { accountId: query.accountId } : {}),
        ...(typeof query.categoryId === 'string' ? { categoryId: query.categoryId } : {}),
        ...(query.kind === 'EXPENSE' || query.kind === 'INCOME' ? { kind: query.kind } : {}),
      },
      include: { fxSnapshot: true },
      orderBy: { occurredAt: 'asc' },
    });
    const nativeTotals: Record<string, string> = {};
    let baseTotal = '0';
    let partial = false;
    const warnings: string[] = [];
    const affectedIds: string[] = [];
    const items = transactions.map((transaction) => {
      nativeTotals[transaction.currencyCode] = add(
        nativeTotals[transaction.currencyCode] ?? '0',
        transaction.kind === 'EXPENSE' ? `-${transaction.amount}` : asString(transaction.amount),
      );
      if (transaction.currencyCode === prefs.baseCurrency)
        baseTotal = add(
          baseTotal,
          transaction.kind === 'EXPENSE' ? `-${transaction.amount}` : asString(transaction.amount),
        );
      else if (transaction.fxSnapshot?.baseCurrency === prefs.baseCurrency)
        baseTotal = add(
          baseTotal,
          transaction.kind === 'EXPENSE'
            ? `-${transaction.fxSnapshot.baseAmount}`
            : asString(transaction.fxSnapshot.baseAmount),
        );
      else {
        partial = true;
        affectedIds.push(transaction.id);
        warnings.push(`Missing FX evidence for ${transaction.currencyCode}/${prefs.baseCurrency}`);
      }
      return {
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? undefined,
        kind: transaction.kind,
        amount: fixed(transaction.amount, currencyDefaults[transaction.currencyCode] ?? 2),
        currencyCode: transaction.currencyCode,
        occurredAt: new Date(transaction.occurredAt).toISOString(),
        note: transaction.note ?? undefined,
        transferId: transaction.transferId ?? undefined,
      };
    });
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      baseCurrency: prefs.baseCurrency,
      timezone: prefs.timezone,
      items,
      nativeTotals,
      baseTotal: partial ? undefined : baseTotal,
      partial,
      warnings,
      affectedIds,
    };
  }
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('search')
  search(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.reports.search(req.user.sub, query);
  }

  @Get()
  get(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.reports.get(req.user.sub, query);
  }
}
