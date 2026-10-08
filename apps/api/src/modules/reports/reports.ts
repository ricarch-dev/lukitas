import { Controller, Get, Injectable, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { validation } from '../../common/errors.js';
import { record } from '../../common/request-input.js';
import { dashboardPeriod } from '../dashboard/dashboard-timezone.js';
import { validatedMonthBounds } from '../planning/planning-time.js';
import { add, asString, currencyDefaults, fixed } from '../planning/planning-support.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
      };
    });
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      baseCurrency: prefs.baseCurrency,
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

  @Get()
  get(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.reports.get(req.user.sub, query);
  }
}
