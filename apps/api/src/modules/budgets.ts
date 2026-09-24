import { Injectable } from '@nestjs/common';
import type { Budget, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { notFound, validation } from '../common/errors.js';
import { record, requiredString } from '../common/request-input.js';
import { addDecimal, code, currencyData, decimalText, fixedAmount, nativeAmount } from './p0-finance.js';
import { validatedMonthBounds } from './planning-time.js';

type BudgetTransaction = Prisma.TransactionGetPayload<{ include: { fxSnapshot: true } }>;

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  async upsert(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const categoryId = requiredString(input.categoryId, 'Category is required');
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, archivedAt: null },
    });
    if (!category || category.userId !== userId || category.archivedAt) notFound('Active category not found');
    const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) validation('Onboarding is required');
    const month = requiredString(input.month, 'Month is required');
    validatedMonthBounds(month, prefs.timezone);
    const existing = await this.prisma.budget.findUnique({
      where: { userId_categoryId_monthKey: { userId, categoryId: category.id, monthKey: month } },
    });
    if (existing && existing.userId !== userId) notFound('Budget not found');
    const currencyCode = code(existing ? existing.currencyCode : prefs.baseCurrency);
    const limit = nativeAmount(input.limit, currencyCode, 'positive');
    if (!existing) {
      await this.prisma.currency.upsert({
        where: { code: currencyCode },
        create: currencyData(currencyCode),
        update: {},
      });
    }
    const budget = await this.prisma.budget.upsert({
      where: { userId_categoryId_monthKey: { userId, categoryId: category.id, monthKey: month } },
      create: {
        userId, categoryId: category.id, monthKey: month, timezone: prefs.timezone,
        currencyCode, limit,
      },
      update: { limit },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'BUDGET_UPSERTED', targetId: budget.id, metadata: { month } },
    });
    const result = await this.progress(userId, budget);
    await this.idem.save(userId, key, body, result);
    return result;
  }

  async list(userId: string, month?: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, ...(month ? { monthKey: month } : {}) },
      orderBy: { monthKey: 'desc' },
    });
    return Promise.all(budgets.map((budget) => this.progress(userId, budget)));
  }

  async get(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!budget || budget.userId !== userId) notFound('Budget not found');
    return this.progress(userId, budget);
  }

  private async progress(userId: string, budget: Budget) {
    const unit = code(budget.currencyCode);
    const { from, to } = validatedMonthBounds(budget.monthKey, budget.timezone);
    const transactions: BudgetTransaction[] = await this.prisma.transaction.findMany({
      where: {
        userId, categoryId: budget.categoryId, kind: 'EXPENSE', voidedAt: null,
        occurredAt: { gte: from, lt: to },
      },
      include: { fxSnapshot: true },
    });
    let spent = '0';
    const warnings: string[] = [];
    const affectedIds: string[] = [];
    for (const transaction of transactions) {
      if (transaction.currencyCode === unit) {
        spent = addDecimal(spent, decimalText(transaction.amount));
      } else if (transaction.fxSnapshot?.baseCurrency === unit) {
        spent = addDecimal(spent, decimalText(transaction.fxSnapshot.baseAmount));
      } else {
        affectedIds.push(transaction.id);
        warnings.push(`Missing FX evidence for ${transaction.currencyCode}/${unit}`);
      }
    }
    return {
      id: budget.id, categoryId: budget.categoryId, month: budget.monthKey,
      timezone: budget.timezone, currencyCode: unit,
      limit: fixedAmount(budget.limit, currencyData(unit).precision),
      spent: fixedAmount(spent, currencyData(unit).precision),
      remaining: fixedAmount(addDecimal(decimalText(budget.limit), `-${spent}`), currencyData(unit).precision),
      partial: affectedIds.length > 0, warnings, affectedIds,
    };
  }
}
