import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { debtOutstanding } from '@lukitas/domain';
import { randomInt } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import type { Prisma } from '@prisma/client';
import type { DebtDto } from '@lukitas/contracts';
import type { AuthenticatedRequest } from '../../common/types.ts';
import { PrismaService } from '../../common/prisma.ts';
import { IdempotencyService } from '../../common/idempotency.ts';
import { AppError, notFound, validation } from '../../common/errors.ts';
import { AuthGuard } from '../../common/guards/auth.guard.ts';
import { record } from '../../common/request-input.ts';
import { code, currencyData, nativeAmount } from '../finance/amounts.ts';
import { debtDirection, debtDueDate, debtInstant, debtText, localDebtDate } from './debt-input.ts';
import { debtDto, debtInclude, debtTotals } from './debt-mapper.ts';
import { debtCash, postDebtCash } from './debt-cash.ts';

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  private async today(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const prefs = await tx.userPreferences.findUnique({ where: { userId } });
    return localDebtDate(new Date(), prefs?.timezone ?? 'UTC');
  }

  async list(userId: string) {
    const rows = await this.prisma.debt.findMany({
      where: { userId },
      include: debtInclude,
      orderBy: { createdAt: 'desc' },
    });
    const today = await this.today(userId);
    const items = rows.map((row) => debtDto(row, today));
    return { items, totals: debtTotals(items) };
  }

  async get(userId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({ where: { id, userId }, include: debtInclude });
    if (!debt) notFound('Debt not found');
    return debtDto(debt, await this.today(userId));
  }

  private async atomic(
    userId: string,
    key: string | undefined,
    command: object,
    run: (tx: Prisma.TransactionClient) => Promise<DebtDto>,
  ) {
    const replay = await this.idem.replay(userId, key, command);
    if (replay !== undefined) return replay;
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const result = await run(tx);
          if (key)
            await tx.idempotencyKey.create({
              data: {
                userId,
                key,
                fingerprint: this.idem.fingerprint(command),
                response: { ...result, events: result.events.map((event) => ({ ...event })) },
              },
            });
          return result;
        });
      } catch (error) {
        // The transaction has rolled back. A competing retry may have committed this key.
        const committed = await this.idem.replay(userId, key, command);
        if (committed !== undefined) return committed;
        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
        const retryable =
          errorCode === 'SQLITE_BUSY' || errorCode === 'SQLITE_LOCKED' || errorCode === 'P2034';
        // Retry only aborted lock/conflict transactions, at most twice, with bounded jitter.
        if (retryable && attempt < 2) {
          await wait(randomInt(15, 45) * (attempt + 1));
          continue;
        }
        if (retryable || errorCode === 'P2002' || errorCode === 'P2028' || errorCode === 'P1008')
          throw new AppError('CONFLICT', 'The debt changed. Refresh before trying again.', 409);
        throw error;
      }
    }
  }

  async create(userId: string, key: string | undefined, body: unknown) {
    return this.atomic(userId, key, { operation: 'debt:create', body }, async (tx) => {
      const input = record(body);
      const direction = debtDirection(input.direction);
      const counterparty = debtText(input.counterparty, 'Counterparty');
      const concept = debtText(input.concept, 'Concept');
      const currencyCode = code(input.currencyCode);
      const principal = nativeAmount(input.principal, currencyCode, 'positive');
      const occurredAt = debtInstant(input.occurredAt);
      const dueDate = debtDueDate(input.dueDate);
      const prefs = await tx.userPreferences.findUnique({ where: { userId } });
      if (dueDate && dueDate < localDebtDate(occurredAt, prefs?.timezone ?? 'UTC'))
        validation('Due date cannot precede the recorded date');
      await tx.currency.upsert({
        where: { code: currencyCode },
        create: currencyData(currencyCode),
        update: {},
      });
      const cash =
        input.cash === undefined ? undefined : await debtCash(tx, userId, input.cash, currencyCode);
      if (cash && cash.debtAmount !== principal)
        validation('Cash conversion must equal the principal amount');
      const transactionId = cash
        ? await postDebtCash(tx, userId, direction, 'ORIGINATION', concept, occurredAt, cash)
        : undefined;
      const debt = await tx.debt.create({
        data: {
          userId,
          direction,
          counterparty,
          concept,
          currencyCode,
          principal,
          occurredAt,
          dueDate,
          events: {
            create: {
              kind: 'ORIGINATION',
              occurredAt,
              debtAmount: principal,
              ...cash,
              transactionId,
            },
          },
        },
        include: debtInclude,
      });
      return debtDto(debt, await this.today(userId, tx));
    });
  }

  async pay(userId: string, id: string, key: string | undefined, body: unknown) {
    return this.atomic(userId, key, { operation: 'debt:pay', id, body }, async (tx) => {
      // Claim the write before reading the aggregate, avoiding SQLite deferred lock upgrades.
      const claimed = await tx.debt.updateMany({
        where: { id, userId },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) notFound('Debt not found');
      const debt = await tx.debt.findFirstOrThrow({ where: { id, userId }, include: debtInclude });
      const input = record(body);
      const occurredAt = debtInstant(input.occurredAt);
      if (occurredAt < debt.occurredAt) validation('Payment cannot precede the debt');
      const cash = await debtCash(tx, userId, input, debt.currencyCode);
      try {
        debtOutstanding(debt.principal, [
          ...debt.events
            .filter((event) => event.kind === 'PAYMENT')
            .map((event) => event.debtAmount),
          cash.debtAmount,
        ]);
      } catch (error) {
        if (error instanceof RangeError) validation(error.message);
        throw error;
      }
      const transactionId = await postDebtCash(
        tx,
        userId,
        debtDirection(debt.direction),
        'PAYMENT',
        debt.concept,
        occurredAt,
        cash,
      );
      await tx.debtEvent.create({
        data: { debtId: id, kind: 'PAYMENT', occurredAt, ...cash, transactionId },
      });
      const updated = await tx.debt.findUniqueOrThrow({ where: { id }, include: debtInclude });
      return debtDto(updated, await this.today(userId, tx));
    });
  }
}

@Controller('debts')
@UseGuards(AuthGuard)
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) {
    return this.debts.list(req.user.sub);
  }
  @Get(':id') get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.debts.get(req.user.sub, id);
  }
  @Post() create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.debts.create(req.user.sub, key, body);
  }
  @Post(':id/payments') pay(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.debts.pay(req.user.sub, id, key, body);
  }
}
