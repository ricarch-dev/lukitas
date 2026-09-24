import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Category, RecurringRule } from '@prisma/client';
import type { AuthenticatedRequest } from '../common/types.js';
import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { AppError, notFound, validation } from '../common/errors.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { dashboardPeriod } from './dashboard-timezone.js';
import { record, requiredString } from '../common/request-input.js';
import { BudgetsService } from './budgets.js';
import { validatedMonthBounds } from './planning-time.js';
export { BudgetsService } from './budgets.js';
export { validatedMonthBounds } from './planning-time.js';

const currencyDefaults: Record<string, number> = { USD: 2, EUR: 2, VES: 2, GBP: 2, JPY: 0, BTC: 8 };
const asString = (value: unknown): string => String(value);
const now = () => new Date();
const positiveAmount = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'bigint')
    validation('Amount must be an exact decimal string');
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text) || /^0+(?:\.0+)?$/.test(text))
    validation('Amount must be positive');
  return text;
};
const instant = (value: unknown): Date => {
  const date = value ? new Date(String(value)) : now();
  if (!Number.isFinite(date.getTime())) validation('Date must be a valid ISO instant');
  return date;
};
const safeTimezone = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) validation('Timezone is required');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    validation('Unsupported timezone');
  }
  return value;
};
const normalizeName = (value: unknown): string => {
  if (typeof value !== 'string') validation('Name is required');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) validation('Name must contain 1-80 characters');
  return name;
};
const normalizedName = (value: string) => value.toLocaleLowerCase();
const code = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value))
    validation('Currency must be an uppercase ISO-4217 code');
  return value;
};
const add = (left: string, right: string): string => {
  const parts = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return [BigInt(`${whole}${fraction}`), fraction.length] as const;
  };
  const [a, as] = parts(left);
  const [b, bs] = parts(right);
  const scale = Math.max(as, bs);
  const raw = a * 10n ** BigInt(scale - as) + b * 10n ** BigInt(scale - bs);
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const text = abs.toString().padStart(scale + 1, '0');
  return (
    `${negative ? '-' : ''}${text.slice(0, -scale || undefined)}${scale ? `.${text.slice(-scale).replace(/0+$/, '')}` : ''}`.replace(
      /\.$/,
      '',
    ) || '0'
  );
};
const multiply = (left: string, right: string, precision = 2): string => {
  const parts = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return [BigInt(`${whole}${fraction}`), fraction.length] as const;
  };
  const [a, as] = parts(left);
  const [b, bs] = parts(right);
  const scale = as + bs;
  const divisor = 10n ** BigInt(Math.max(0, scale - precision));
  const raw = divisor > 1n ? (a * b) / divisor : a * b * 10n ** BigInt(precision - scale);
  const text = raw.toString().padStart(precision + 1, '0');
  return `${text.slice(0, -precision || undefined)}${precision ? `.${text.slice(-precision)}` : ''}`;
};
const fixed = (value: unknown, precision = 2) => {
  const text = asString(value);
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  return `${negative ? '-' : ''}${whole}${precision ? `.${fraction.padEnd(precision, '0').slice(0, precision)}` : ''}`;
};
const dtoCategory = (category: Category) => ({
  id: category.id,
  name: category.name,
  archived: Boolean(category.archivedAt),
});
const dtoRule = (rule: RecurringRule) => ({
  id: rule.id,
  accountId: rule.accountId,
  categoryId: rule.categoryId ?? undefined,
  kind: rule.kind,
  amount: fixed(rule.amount, currencyDefaults[rule.currencyCode] ?? 2),
  currencyCode: rule.currencyCode,
  note: rule.note ?? undefined,
  cadence: rule.cadence,
  timezone: rule.timezone,
  startAt: new Date(rule.startAt).toISOString(),
  endAt: rule.endAt ? new Date(rule.endAt).toISOString() : undefined,
  nextOccurrence: new Date(rule.nextOccurrence).toISOString(),
  active: rule.active,
});
const addCadence = (value: Date, cadence: string) => {
  const next = new Date(value);
  if (cadence === 'DAILY') next.setUTCDate(next.getUTCDate() + 1);
  else if (cadence === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
};

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}
  async list(userId: string, includeArchived = false) {
    const categories = await this.prisma.category.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { name: 'asc' },
    });
    return categories.map(dtoCategory);
  }
  async create(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const name = normalizeName(input.name);
    const normalized = normalizedName(name);
    const existing = await this.prisma.category.findFirst({
      where: { userId, normalizedName: normalized },
    });
    if (existing) throw new AppError('CONFLICT', 'Category name already exists', 409);
    const category = await this.prisma.category.create({
      data: { userId, name, normalizedName: normalized },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_CREATED', targetId: category.id },
    });
    const result = dtoCategory(category);
    await this.idem.save(userId, key, body, result);
    return result;
  }
  async rename(userId: string, id: string, body: unknown) {
    const category = await this.find(userId, id);
    const name = normalizeName(record(body).name);
    const normalized = normalizedName(name);
    const duplicate = await this.prisma.category.findFirst({
      where: { userId, normalizedName: normalized, NOT: { id } },
    });
    if (duplicate) throw new AppError('CONFLICT', 'Category name already exists', 409);
    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: { name, normalizedName: normalized },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_RENAMED', targetId: id },
    });
    return dtoCategory(updated);
  }
  async archive(userId: string, id: string, key?: string) {
    const body = { id };
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    await this.find(userId, id);
    const updated = await this.prisma.category.update({
      where: { id },
      data: { archivedAt: now() },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'CATEGORY_ARCHIVED', targetId: id },
    });
    const result = dtoCategory(updated);
    await this.idem.save(userId, key, body, result);
    return result;
  }
  private async find(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) notFound('Category not found');
    return category;
  }
}

@Injectable()
export class RecurringRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}
  async list(userId: string) {
    const rules = await this.prisma.recurringRule.findMany({
      where: { userId },
      orderBy: { nextOccurrence: 'asc' },
    });
    return rules.map(dtoRule);
  }
  async create(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const account = await this.prisma.account.findFirst({
      where: { id: requiredString(input.accountId, 'Account is required'), userId, archivedAt: null },
    });
    if (!account) notFound('Account not found');
    const kind = input.kind;
    if (kind !== 'INCOME' && kind !== 'EXPENSE') validation('kind must be INCOME or EXPENSE');
    const cadence = input.cadence;
    if (cadence !== 'DAILY' && cadence !== 'WEEKLY' && cadence !== 'MONTHLY') validation('Unsupported cadence');
    const timezone = safeTimezone(input.timezone);
    const startAt = instant(input.startAt);
    const endAt = input.endAt ? instant(input.endAt) : null;
    if (endAt && endAt < startAt) validation('endAt must be after startAt');
    const currencyCode = code(input.currencyCode ?? account.currencyCode);
    if (currencyCode !== account.currencyCode)
      throw new AppError('CURRENCY_MISMATCH', 'Rule currency must match account currency');
    let categoryId: string | null = null;
    if (input.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: requiredString(input.categoryId, 'Category is required'), userId, archivedAt: null },
      });
      if (!category) notFound('Active category not found');
      categoryId = category.id;
    }
    const rule = await this.prisma.recurringRule.create({
      data: {
        userId,
        accountId: account.id,
        categoryId,
        kind,
        amount: positiveAmount(input.amount),
        currencyCode,
        note: typeof input.note === 'string' ? input.note.trim() : null,
        cadence,
        timezone,
        startAt,
        endAt,
        nextOccurrence: startAt,
      },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'RECURRING_RULE_CREATED', targetId: rule.id },
    });
    const result = dtoRule(rule);
    await this.idem.save(userId, key, body, result);
    return result;
  }
  async update(userId: string, id: string, body: unknown) {
    const input = record(body);
    const rule = await this.find(userId, id);
    const active = input.active === undefined ? rule.active : Boolean(input.active);
    const updated = await this.prisma.recurringRule.update({
      where: { id: rule.id },
      data: { active, ...(input.endAt ? { endAt: instant(input.endAt) } : {}) },
    });
    await this.prisma.auditEvent.create({
      data: { userId, action: 'RECURRING_RULE_UPDATED', targetId: id },
    });
    return dtoRule(updated);
  }
  async catchUp(userId: string, id: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const asOf = input.until ? instant(input.until) : now();
    const result = await this.prisma.$transaction(
      async (tx) => {
        const rule = await tx.recurringRule.findFirst({ where: { id, userId } });
        if (!rule || rule.userId !== userId) notFound('Recurring rule not found');
        if (!rule.active)
          return { ruleId: id, created: [], nextOccurrence: rule.nextOccurrence, active: false };
        const created: Array<{ occurrenceAt: string; transactionId: string }> = [];
        let cursor = new Date(rule.nextOccurrence);
        let count = 0;
        while (cursor <= asOf && count < 500 && (!rule.endAt || cursor <= new Date(rule.endAt))) {
          let occurrence = await tx.recurringOccurrence.findUnique({
            where: { ruleId_occurrenceAt: { ruleId: rule.id, occurrenceAt: cursor } },
          });
          if (!occurrence) {
            const transaction = await tx.transaction.create({
              data: {
                userId,
                accountId: rule.accountId,
                kind: rule.kind,
                amount: rule.amount,
                currencyCode: rule.currencyCode,
                occurredAt: cursor,
                note: rule.note,
                categoryId: rule.categoryId,
              },
            });
            await tx.ledgerEntry.create({
              data: {
                transactionId: transaction.id,
                accountId: rule.accountId,
                signedAmount: rule.kind === 'EXPENSE' ? `-${rule.amount}` : rule.amount,
              },
            });
            occurrence = await tx.recurringOccurrence.create({
              data: { ruleId: rule.id, occurrenceAt: cursor, transactionId: transaction.id },
            });
            await tx.auditEvent.create({
              data: {
                userId,
                action: 'RECURRING_OCCURRENCE_CREATED',
                targetId: occurrence.id,
                metadata: { transactionId: transaction.id },
              },
            });
            created.push({ occurrenceAt: cursor.toISOString(), transactionId: transaction.id });
          }
          cursor = addCadence(cursor, rule.cadence);
          count += 1;
        }
        const active = !rule.endAt || cursor <= new Date(rule.endAt);
        await tx.recurringRule.update({
          where: { id: rule.id },
          data: { nextOccurrence: cursor, active },
        });
        return { ruleId: rule.id, created, nextOccurrence: cursor.toISOString(), active };
      },
      { isolationLevel: 'Serializable' },
    );
    await this.idem.save(userId, key, body, result);
    return result;
  }
  private async find(userId: string, id: string) {
    const rule = await this.prisma.recurringRule.findFirst({ where: { id, userId } });
    if (!rule || rule.userId !== userId) notFound('Recurring rule not found');
    return rule;
  }
}

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

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query('includeArchived') archived?: string) {
    return this.categories.list(req.user.sub, archived === 'true');
  }
  @Post() create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.categories.create(req.user.sub, key, body);
  }
  @Patch(':id') rename(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.categories.rename(req.user.sub, id, body);
  }
  @Post(':id/archive') archive(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return this.categories.archive(req.user.sub, id, key);
  }
}
@Controller('budgets')
@UseGuards(AuthGuard)
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}
  @Get() list(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return this.budgets.list(req.user.sub, month);
  }
  @Get(':id') get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.budgets.get(req.user.sub, id);
  }
  @Post() upsert(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.budgets.upsert(req.user.sub, key, body);
  }
}
@Controller('recurring-rules')
@UseGuards(AuthGuard)
export class RecurringRulesController {
  constructor(private readonly rules: RecurringRulesService) {}
  @Get() list(@Req() req: AuthenticatedRequest) {
    return this.rules.list(req.user.sub);
  }
  @Post() create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.rules.create(req.user.sub, key, body);
  }
  @Patch(':id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.rules.update(req.user.sub, id, body);
  }
  @Post(':id/catch-up') catchUp(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.rules.catchUp(req.user.sub, id, key, body);
  }
}
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get() get(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.reports.get(req.user.sub, query);
  }
}

export const p1Providers = [
  CategoriesService,
  BudgetsService,
  RecurringRulesService,
  ReportsService,
];
export const p1Controllers = [
  CategoriesController,
  BudgetsController,
  RecurringRulesController,
  ReportsController,
];
