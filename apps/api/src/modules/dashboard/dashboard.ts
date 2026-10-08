import { Controller, Get, Query, Req, UseGuards, Injectable } from '@nestjs/common';
import type { DashboardAccountCurrencyFilter } from '@lukitas/contracts';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { validation } from '../../common/errors.js';
import { dashboardPeriod } from './dashboard-timezone.js';
import { dashboardComparison } from './dashboard-valuation.js';
import { accountDto } from '../accounts/account-mapper.js';
import {
  addDecimal,
  asString,
  fixedAmount,
  monetaryUnit,
  multiplyDecimal,
  transactionDto,
  type StoredDecimal,
} from '../finance/amounts.js';

const dashboardAccountCurrency = (value: unknown): DashboardAccountCurrencyFilter | undefined => {
  if (value === undefined) return undefined;
  if (value === 'VES' || value === 'USD') return value;
  validation('accountCurrency must be VES or USD');
};

type FlowTransaction = {
  amount: StoredDecimal;
  currencyCode: string;
  kind: string;
  occurredAt: Date;
  transferId: string | null;
  fxSnapshot: { baseCurrency: string; baseAmount: StoredDecimal } | null;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async flowAmount(transaction: FlowTransaction, baseCurrency: string) {
    const sourceCode = monetaryUnit(transaction.currencyCode).code;
    if (sourceCode === baseCurrency) return asString(transaction.amount);
    if (transaction.fxSnapshot?.baseCurrency === baseCurrency)
      return asString(transaction.fxSnapshot.baseAmount);
    const rate = await this.prisma.fxRate.findFirst({
      where: {
        baseCode: sourceCode,
        quoteCode: baseCurrency,
        effectiveAt: { lte: transaction.occurredAt },
      },
      orderBy: { effectiveAt: 'desc' },
    });
    return rate
      ? multiplyDecimal(
          asString(transaction.amount),
          asString(rate.rate),
          monetaryUnit(baseCurrency).precision,
        )
      : undefined;
  }

  async get(
    userId: string,
    fromValue?: string,
    toValue?: string,
    clock = new Date(),
    rawAccountCurrency?: unknown,
  ) {
    const accountCurrency = dashboardAccountCurrency(rawAccountCurrency);
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const baseUnit = monetaryUnit(preferences?.baseCurrency ?? 'USD');
    const timezone = preferences?.timezone ?? 'UTC';
    const { from, to } = dashboardPeriod(timezone, fromValue, toValue);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()))
      validation('from and to must be valid ISO instants');
    if (to < from) validation('to must be after from');
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        archivedAt: null,
        ...(accountCurrency ? { currencyCode: accountCurrency } : {}),
      },
      include: { currency: true, bankGroup: true },
      orderBy: { createdAt: 'asc' },
    });
    const accountDtos = await Promise.all(
      accounts.map(async (account) => {
        const entries = await this.prisma.ledgerEntry.findMany({
          where: { accountId: account.id, transaction: { voidedAt: null } },
          select: { signedAmount: true },
        });
        return accountDto(
          account,
          entries.reduce(
            (total, entry) => addDecimal(total, asString(entry.signedAmount)),
            asString(account.openingBalance),
          ),
        );
      }),
    );
    const accountScope = accountCurrency
      ? { accountId: { in: accountDtos.map((account) => account.id) } }
      : {};
    const periodTransactions = await this.prisma.transaction.findMany({
      where: { userId, ...accountScope, occurredAt: { gte: from, lte: to }, voidedAt: null },
      select: {
        amount: true,
        currencyCode: true,
        kind: true,
        occurredAt: true,
        transferId: true,
        fxSnapshot: { select: { baseCurrency: true, baseAmount: true } },
      },
    });
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId, ...accountScope, occurredAt: { gte: from, lte: to }, voidedAt: null },
      include: { fxSnapshot: true },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
    const flowWarnings = new Set<string>();
    const balanceWarnings = new Set<string>();
    let income = '0';
    let expense = '0';
    let flowPartial = false;
    for (const transaction of periodTransactions) {
      if (transaction.transferId) continue;
      const converted = await this.flowAmount(transaction, baseUnit.code);
      if (converted === undefined) {
        flowPartial = true;
        flowWarnings.add(
          `Missing historical FX rate for ${transaction.currencyCode}/${baseUnit.code}`,
        );
      } else if (transaction.kind === 'INCOME' || transaction.kind === 'OPENING') {
        income = addDecimal(income, converted);
      } else {
        expense = addDecimal(expense, converted);
      }
    }
    let total = '0';
    let totalPartial = false;
    for (const account of accountDtos) {
      if (account.currency.code === baseUnit.code) total = addDecimal(total, account.balance);
      else {
        const rate = await this.prisma.fxRate.findFirst({
          where: {
            baseCode: account.currency.code,
            quoteCode: baseUnit.code,
            effectiveAt: { lte: to },
          },
          orderBy: { effectiveAt: 'desc' },
        });
        if (!rate) {
          totalPartial = true;
          balanceWarnings.add(`Missing FX rate for ${account.currency.code}/${baseUnit.code}`);
        } else {
          total = addDecimal(
            total,
            multiplyDecimal(account.balance, asString(rate.rate), baseUnit.precision),
          );
        }
      }
    }
    const comparison = await dashboardComparison(
      this.prisma,
      userId,
      timezone,
      clock,
      accountCurrency,
    );
    return {
      baseCurrency: baseUnit.code,
      accounts: accountDtos,
      totals: {
        amount: fixedAmount(total, baseUnit.precision),
        partial: totalPartial,
        warnings: [...balanceWarnings],
      },
      flow: {
        income: fixedAmount(income, baseUnit.precision),
        expense: fixedAmount(expense, baseUnit.precision),
        partial: flowPartial,
        warnings: [...flowWarnings],
      },
      recentActivity: recentTransactions.map(transactionDto),
      comparison,
    };
  }
}

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountCurrency') accountCurrency?: unknown,
  ) {
    return this.dashboard.get(req.user.sub, from, to, undefined, accountCurrency);
  }
}
