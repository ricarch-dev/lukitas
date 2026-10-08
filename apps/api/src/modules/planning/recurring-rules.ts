import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { IdempotencyService } from '../../common/idempotency.js';
import { AppError, notFound, validation } from '../../common/errors.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { record, requiredString } from '../../common/request-input.js';
import {
  addCadence,
  code,
  dtoRule,
  instant,
  now,
  positiveAmount,
  safeTimezone,
} from './planning-support.js';

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
      where: {
        id: requiredString(input.accountId, 'Account is required'),
        userId,
        archivedAt: null,
      },
    });
    if (!account) notFound('Account not found');
    const kind = input.kind;
    if (kind !== 'INCOME' && kind !== 'EXPENSE') validation('kind must be INCOME or EXPENSE');
    const cadence = input.cadence;
    if (cadence !== 'DAILY' && cadence !== 'WEEKLY' && cadence !== 'MONTHLY')
      validation('Unsupported cadence');
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
        where: {
          id: requiredString(input.categoryId, 'Category is required'),
          userId,
          archivedAt: null,
        },
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

@Controller('recurring-rules')
@UseGuards(AuthGuard)
export class RecurringRulesController {
  constructor(private readonly rules: RecurringRulesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.rules.list(req.user.sub);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.rules.create(req.user.sub, key, body);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.rules.update(req.user.sub, id, body);
  }

  @Post(':id/catch-up')
  catchUp(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.rules.catchUp(req.user.sub, id, key, body);
  }
}
