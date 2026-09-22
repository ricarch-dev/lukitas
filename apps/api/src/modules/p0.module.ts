import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Injectable,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../common/types.js';
import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { AppError, notFound, validation } from '../common/errors.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import {
  digestToken,
  hashPassword,
  opaqueToken,
  signAccessToken,
  verifyPassword,
} from '../common/crypto.js';
import { dashboardPeriod } from './dashboard-timezone.js';
import { AccountsController, AccountsService, accountDto } from './accounts.js';
import {
  addDecimal,
  asString,
  code,
  currencyDefaults,
  instant,
  multiplyDecimal,
  now,
  positiveAmount,
  transactionDto,
} from './p0-finance.js';

const normalizeEmail = (email: unknown): string => {
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim()))
    validation('A valid email is required');
  return email.trim().toLowerCase();
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

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  private async userDto(user: any) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });
    return {
      id: user.id,
      email: user.email,
      onboardingComplete: Boolean(preferences?.onboardingComplete),
    };
  }
  private async issue(user: any) {
    const refreshToken = opaqueToken();
    const familyId = randomUUID();
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: digestToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    const dto = await this.userDto(user);
    return {
      user: dto,
      accessToken: await signAccessToken(user.id, dto.onboardingComplete),
      refreshToken,
    };
  }
  async register(body: any) {
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    if (typeof password !== 'string' || password.length < 8)
      validation('Password must contain at least 8 characters');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('CONFLICT', 'Unable to create account', 409);
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });
    return this.issue(user);
  }
  async login(body: any) {
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      typeof password !== 'string' ||
      !(await verifyPassword(password, user.passwordHash))
    )
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    return this.issue(user);
  }
  async refresh(body: any) {
    if (typeof body?.refreshToken !== 'string')
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    const hash = digestToken(body.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt <= now()) {
      if (session)
        await this.prisma.refreshSession.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: now() },
        });
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    const refreshToken = opaqueToken();
    const dto = await this.userDto(user);
    await this.prisma.$transaction([
      this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: now() } }),
      this.prisma.refreshSession.create({
        data: {
          userId: user.id,
          familyId: session.familyId,
          tokenHash: digestToken(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      }),
    ]);
    return {
      user: dto,
      accessToken: await signAccessToken(user.id, dto.onboardingComplete),
      refreshToken,
    };
  }
  async logout(userId: string) {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now() },
    });
    return { ok: true };
  }
  async recovery(body: any) {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const user = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    if (user) {
      const token = opaqueToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: digestToken(token),
          expiresAt: new Date(Date.now() + 30 * 60000),
        },
      });
    }
    return { accepted: true };
  }
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    return { user: await this.userDto(user) };
  }
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}
  async complete(userId: string, key: string | undefined, body: any) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const baseCurrency = code(body?.baseCurrency);
    const accountCurrency = code(body?.accountCurrency ?? baseCurrency);
    const timezone = safeTimezone(body?.timezone);
    const name =
      typeof body?.accountName === 'string' && body.accountName.trim()
        ? body.accountName.trim()
        : validation('Account name is required');
    const openingBalance = body?.openingBalance === undefined ? '0' : String(body.openingBalance);
    positiveAmount(openingBalance === '0' ? '1' : openingBalance);
    await this.ensureCurrency(baseCurrency);
    await this.ensureCurrency(accountCurrency);
    const result = await this.prisma.$transaction(async (tx: any) => {
      const account = await tx.account.create({
        data: { userId, name, currencyCode: accountCurrency, openingBalance },
        include: { currency: true },
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
  private async ensureCurrency(value: string) {
    await this.prisma.currency.upsert({
      where: { code: value },
      create: { code: value, precision: currencyDefaults[value] ?? 2 },
      update: {},
    });
  }
  async get(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    return preferences
      ? {
          complete: preferences.onboardingComplete,
          baseCurrency: preferences.baseCurrency,
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
  async create(userId: string, key: string | undefined, body: any) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const source = await this.prisma.account.findFirst({
      where: { id: body?.sourceAccountId, userId },
      include: { currency: true },
    });
    const destination = await this.prisma.account.findFirst({
      where: { id: body?.destinationAccountId, userId },
      include: { currency: true },
    });
    if (!source || !destination) notFound('Transfer account not found');
    if (source.archivedAt || destination.archivedAt)
      throw new AppError('ACCOUNT_ARCHIVED', 'Archived accounts cannot be transferred');
    if (source.id === destination.id) validation('Transfer accounts must be different');
    const amount = positiveAmount(body?.amount);
    const occurredAt = instant(body?.occurredAt);
    const crossCurrency = source.currencyCode !== destination.currencyCode;
    let destinationAmount = amount;
    let rate: string | undefined;
    let fxSource: 'MARKET' | 'MANUAL' = 'MARKET';
    if (crossCurrency) {
      if (body?.manualRate !== undefined) {
        rate = positiveAmount(body.manualRate);
        fxSource = 'MANUAL';
      } else {
        const historical = await this.prisma.fxRate.findFirst({
          where: {
            baseCode: source.currencyCode,
            quoteCode: destination.currencyCode,
            effectiveAt: { lte: occurredAt },
          },
          orderBy: { effectiveAt: 'desc' },
        });
        if (!historical)
          throw new AppError(
            'MISSING_FX_RATE',
            'A historical FX rate is required for this transfer',
            422,
          );
        rate = asString(historical.rate);
      }
      destinationAmount = multiplyDecimal(amount, rate!, destination.currency.precision);
    }
    const feeAmount = body?.feeAmount === undefined ? undefined : positiveAmount(body.feeAmount);
    const result = await this.prisma.$transaction(async (tx: any) => {
      const transfer = await tx.transfer.create({
        data: {
          userId,
          sourceAccountId: source.id,
          destinationAccountId: destination.id,
          sourceAmount: amount,
          destinationAmount,
          sourceCurrency: source.currencyCode,
          destinationCurrency: destination.currencyCode,
          feeAmount: feeAmount ?? null,
          occurredAt,
        },
      });
      const out = await tx.transaction.create({
        data: {
          userId,
          accountId: source.id,
          kind: 'EXPENSE',
          amount,
          currencyCode: source.currencyCode,
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
          currencyCode: destination.currencyCode,
          occurredAt,
          transferId: transfer.id,
          note: 'Transfer',
        },
      });
      await tx.ledgerEntry.createMany({
        data: [
          { transactionId: out.id, accountId: source.id, signedAmount: `-${amount}` },
          {
            transactionId: incoming.id,
            accountId: destination.id,
            signedAmount: destinationAmount,
          },
        ],
      });
      if (feeAmount) {
        const fee = await tx.transaction.create({
          data: {
            userId,
            accountId: source.id,
            kind: 'EXPENSE',
            amount: feeAmount,
            currencyCode: source.currencyCode,
            occurredAt,
            transferId: transfer.id,
            note: 'Transfer fee',
          },
        });
        await tx.ledgerEntry.create({
          data: { transactionId: fee.id, accountId: source.id, signedAmount: `-${feeAmount}` },
        });
      }
      if (rate)
        await tx.fxSnapshot.create({
          data: {
            transferId: transfer.id,
            effectiveAt: occurredAt,
            source: fxSource,
            rates: {
              create: { baseCode: source.currencyCode, quoteCode: destination.currencyCode, rate },
            },
          },
        });
      return {
        id: transfer.id,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        sourceAmount: amount,
        destinationAmount,
        feeAmount: feeAmount ?? null,
        occurredAt: occurredAt.toISOString(),
        fx: rate ? { rate, source: fxSource } : undefined,
      };
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}
  async void(userId: string, id: string, key: string | undefined, body: any) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    if (typeof body?.reason !== 'string' || !body.reason.trim())
      validation('A reason is required to void a transaction');
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) notFound('Transaction not found');
    if (transaction.voidedAt) return transactionDto(transaction);
    const result = await this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: { voidedAt: now(), voidReason: body.reason.trim() },
      });
      await tx.auditEvent.create({
        data: {
          userId,
          action: 'TRANSACTION_VOIDED',
          targetId: id,
          reason: body.reason.trim(),
          metadata: { kind: transaction.kind },
        },
      });
      return transactionDto(updated);
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async get(userId: string, fromValue?: string, toValue?: string) {
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const baseCurrency = preferences?.baseCurrency ?? 'USD';
    const timezone = preferences?.timezone ?? 'UTC';
    const period = dashboardPeriod(timezone, fromValue, toValue);
    const from = period.from;
    const to = period.to;
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
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: from, lte: to }, voidedAt: null },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });
    let income = '0';
    let expense = '0';
    for (const tx of transactions) {
      if (tx.kind === 'INCOME' || tx.kind === 'OPENING')
        income = addDecimal(income, asString(tx.amount));
      else expense = addDecimal(expense, asString(tx.amount));
    }
    const warnings: string[] = [];
    let total = '0';
    let partial = false;
    for (const account of accountDtos) {
      if (account.currency.code === baseCurrency) total = addDecimal(total, account.balance);
      else {
        const rate = await this.prisma.fxRate.findFirst({
          where: {
            baseCode: account.currency.code,
            quoteCode: baseCurrency,
            effectiveAt: { lte: to },
          },
          orderBy: { effectiveAt: 'desc' },
        });
        if (!rate) {
          partial = true;
          warnings.push(`Missing FX rate for ${account.currency.code}/${baseCurrency}`);
        } else total = addDecimal(total, multiplyDecimal(account.balance, asString(rate.rate), 2));
      }
    }
    return {
      baseCurrency,
      accounts: accountDtos,
      totals: { amount: total, partial, warnings },
      flow: { income, expense },
      recentActivity: transactions.map(transactionDto),
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() body: any) {
    return this.auth.register(body);
  }
  @Post('login') login(@Body() body: any) {
    return this.auth.login(body);
  }
  @Post('refresh') refresh(@Body() body: any) {
    return this.auth.refresh(body);
  }
  @Post('logout') @UseGuards(AuthGuard) logout(@Req() req: AuthenticatedRequest) {
    return this.auth.logout(req.user.sub);
  }
  @Post('recovery') @HttpCode(202) recovery(@Body() body: any) {
    return this.auth.recovery(body);
  }
  @Get('me') @UseGuards(AuthGuard) me(@Req() req: AuthenticatedRequest) {
    return this.auth.me(req.user.sub);
  }
}

@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}
  @Post() complete(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: any,
  ) {
    return this.onboarding.complete(req.user.sub, key, body);
  }
  @Get() get(@Req() req: AuthenticatedRequest) {
    return this.onboarding.get(req.user.sub);
  }
}

@Controller('transfers')
@UseGuards(AuthGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}
  @Post() create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: any,
  ) {
    return this.transfers.create(req.user.sub, key, body);
  }
}

@Controller('transactions')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Post(':id/void') void(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: any,
  ) {
    return this.audit.void(req.user.sub, id, key, body);
  }
}

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get() get(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.get(req.user.sub, from, to);
  }
}

export const p0Providers = [
  PrismaService,
  IdempotencyService,
  AuthService,
  OnboardingService,
  AccountsService,
  TransfersService,
  AuditService,
  DashboardService,
  AuthGuard,
];
export const p0Controllers = [
  AuthController,
  OnboardingController,
  AccountsController,
  TransfersController,
  AuditController,
  DashboardController,
];
