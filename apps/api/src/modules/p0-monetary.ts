import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types.js';
import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { AppError, notFound, validation } from '../common/errors.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { record, requiredString } from '../common/request-input.js';
import { dashboardPeriod } from './dashboard-timezone.js';
import { accountDto } from './accounts.js';
import { selectFxEvidence, type SelectedFxEvidence } from './fx-evidence.js';
import {
  addDecimal,
  asString,
  code,
  convertAmount,
  currencyData,
  fixedAmount,
  instant,
  monetaryUnit,
  multiplyDecimal,
  nativeAmount,
  transactionDto,
  type StoredDecimal,
} from './p0-finance.js';

const safeTimezone = (value: unknown): string => {
  const timezone = requiredString(value, 'Timezone is required');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    validation('Unsupported timezone');
  }
  return timezone;
};

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  async complete(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const baseCurrency = code(input.baseCurrency);
    const accountCurrency = code(input.accountCurrency ?? baseCurrency);
    const timezone = safeTimezone(input.timezone);
    const name = requiredString(input.accountName, 'Account name is required');
    const openingBalance = nativeAmount(input.openingBalance, accountCurrency, 'non-negative');
    await this.ensureCurrency(baseCurrency);
    await this.ensureCurrency(accountCurrency);
    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: { userId, name, currencyCode: accountCurrency, openingBalance },
      });
      await tx.userPreferences.upsert({
        where: { userId },
        create: { userId, baseCurrency, timezone, onboardingComplete: true },
        update: { baseCurrency, timezone, onboardingComplete: true },
      });
      return { complete: true, baseCurrency, timezone, accountId: account.id };
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }

  private async ensureCurrency(value: unknown) {
    const data = currencyData(value);
    await this.prisma.currency.upsert({ where: { code: data.code }, create: data, update: data });
  }

  async get(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    return preferences
      ? {
          complete: preferences.onboardingComplete,
          baseCurrency: code(preferences.baseCurrency),
          timezone: preferences.timezone,
        }
      : { complete: false };
  }
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  async create(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const sourceAccountId = requiredString(input.sourceAccountId, 'Source account is required');
    const destinationAccountId = requiredString(
      input.destinationAccountId,
      'Destination account is required',
    );
    const source = await this.prisma.account.findFirst({
      where: { id: sourceAccountId, userId },
      include: { currency: true },
    });
    const destination = await this.prisma.account.findFirst({
      where: { id: destinationAccountId, userId },
      include: { currency: true },
    });
    if (!source || !destination) notFound('Transfer account not found');
    if (source.archivedAt || destination.archivedAt)
      throw new AppError('ACCOUNT_ARCHIVED', 'Archived accounts cannot be transferred');
    if (source.id === destination.id) validation('Transfer accounts must be different');

    const sourceUnit = monetaryUnit(source.currencyCode);
    const destinationUnit = monetaryUnit(destination.currencyCode);
    const sourceAmount = nativeAmount(input.amount, sourceUnit.code, 'positive');
    const occurredAt = instant(input.occurredAt);
    let destinationAmount = sourceAmount;
    let evidence: SelectedFxEvidence | null = null;
    if (sourceUnit.code !== destinationUnit.code) {
      evidence = await selectFxEvidence(this.prisma, sourceUnit.code, destinationUnit.code, occurredAt, input.manualRate);
      if (!evidence)
        throw new AppError('MISSING_FX_RATE', 'A historical FX rate is required for this transfer', 422);
      destinationAmount = convertAmount(sourceAmount, sourceUnit.code, destinationUnit.code, evidence.rate);
    }
    const feeAmount =
      input.feeAmount === undefined
        ? undefined
        : nativeAmount(input.feeAmount, sourceUnit.code, 'positive');
    const result = await this.prisma.$transaction(async (tx) => {
      const ownedSource = await tx.account.findFirst({
        where: { id: source.id, userId, archivedAt: null },
      });
      const ownedDestination = await tx.account.findFirst({
        where: { id: destination.id, userId, archivedAt: null },
      });
      if (!ownedSource || !ownedDestination) notFound('Transfer account not found');
      const transfer = await tx.transfer.create({
        data: {
          userId,
          sourceAccountId: source.id,
          destinationAccountId: destination.id,
          sourceAmount,
          destinationAmount,
          sourceCurrency: sourceUnit.code,
          destinationCurrency: destinationUnit.code,
          feeAmount: feeAmount ?? null,
          occurredAt,
        },
      });
      const outgoing = await tx.transaction.create({
        data: {
          userId,
          accountId: source.id,
          kind: 'EXPENSE',
          amount: sourceAmount,
          currencyCode: sourceUnit.code,
          occurredAt,
          transferId: transfer.id,
          note: 'Transfer',
        },
      });
      const incoming = await tx.transaction.create({
        data: {
          userId,
          accountId: destination.id,
          kind: 'INCOME',
          amount: destinationAmount,
          currencyCode: destinationUnit.code,
          occurredAt,
          transferId: transfer.id,
          note: 'Transfer',
        },
      });
      await tx.ledgerEntry.createMany({
        data: [
          { transactionId: outgoing.id, accountId: source.id, signedAmount: `-${sourceAmount}` },
          { transactionId: incoming.id, accountId: destination.id, signedAmount: destinationAmount },
        ],
      });
      if (feeAmount) {
        const fee = await tx.transaction.create({
          data: {
            userId,
            accountId: source.id,
            kind: 'EXPENSE',
            amount: feeAmount,
            currencyCode: sourceUnit.code,
            occurredAt,
            transferId: transfer.id,
            note: 'Transfer fee',
          },
        });
        await tx.ledgerEntry.create({
          data: { transactionId: fee.id, accountId: source.id, signedAmount: `-${feeAmount}` },
        });
      }
      if (evidence)
        await tx.fxSnapshot.create({
          data: {
            transferId: transfer.id,
            effectiveAt: evidence.effectiveAt,
            source: evidence.source,
            rates: {
              create: { baseCode: evidence.baseCode, quoteCode: evidence.quoteCode, rate: evidence.rate },
            },
          },
        });
      return {
        id: transfer.id,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        sourceAmount,
        destinationAmount,
        feeAmount: feeAmount ?? null,
        occurredAt: occurredAt.toISOString(),
        fx: evidence ? { rate: evidence.rate, source: evidence.source } : undefined,
      };
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }
}

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
    const sourceCode = code(transaction.currencyCode);
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

  async get(userId: string, fromValue?: string, toValue?: string) {
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const baseUnit = monetaryUnit(preferences?.baseCurrency ?? 'USD');
    const timezone = preferences?.timezone ?? 'UTC';
    const { from, to } = dashboardPeriod(timezone, fromValue, toValue);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()))
      validation('from and to must be valid ISO instants');
    if (to < from) validation('to must be after from');
    const accounts = await this.prisma.account.findMany({
      where: { userId, archivedAt: null },
      include: { currency: true },
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
    const periodTransactions = await this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: from, lte: to }, voidedAt: null },
      select: {
        amount: true, currencyCode: true, kind: true, occurredAt: true, transferId: true,
        fxSnapshot: { select: { baseCurrency: true, baseAmount: true } },
      },
    });
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: from, lte: to }, voidedAt: null },
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
        flowWarnings.add(`Missing historical FX rate for ${transaction.currencyCode}/${baseUnit.code}`);
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
    };
  }
}

@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  complete(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.onboarding.complete(req.user.sub, key, body);
  }

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.onboarding.get(req.user.sub);
  }
}

@Controller('transfers')
@UseGuards(AuthGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transfers.create(req.user.sub, key, body);
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
  ) {
    return this.dashboard.get(req.user.sub, from, to);
  }
}
