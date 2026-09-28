import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Injectable,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { normalizeAuthEmail, isValidRegistrationPassword } from '@lukitas/domain';
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
import { AccountsController, AccountsService } from './accounts.js';
import { now, transactionDto } from './p0-finance.js';
import { record } from '../common/request-input.js';
import {
  DashboardController,
  DashboardService,
  OnboardingController,
  OnboardingService,
  TransfersController,
  TransfersService,
} from './p0-monetary.js';

export {
  DashboardController,
  DashboardService,
  OnboardingController,
  OnboardingService,
  TransfersController,
  TransfersService,
} from './p0-monetary.js';

const normalizeEmail = (email: unknown): string => {
  const normalized = normalizeAuthEmail(email);
  if (!normalized) validation('A valid email is required');
  return normalized;
};

type UserIdentity = Pick<User, 'id' | 'email'>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async userDto(user: UserIdentity) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });
    return {
      id: user.id,
      email: user.email,
      onboardingComplete: Boolean(preferences?.onboardingComplete),
    };
  }

  private async issue(user: UserIdentity) {
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

  async register(body: unknown) {
    const input = record(body);
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (!isValidRegistrationPassword(password))
      validation('Password must contain at least 8 characters');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('CONFLICT', 'Unable to create account', 409);
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });
    return this.issue(user);
  }

  async login(body: unknown) {
    const input = record(body);
    const email = normalizeEmail(input.email);
    const password = input.password;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      typeof password !== 'string' ||
      !(await verifyPassword(password, user.passwordHash))
    )
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    return this.issue(user);
  }

  async refresh(body: unknown) {
    const input = record(body);
    if (typeof input.refreshToken !== 'string')
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    const hash = digestToken(input.refreshToken);
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

  async recovery(body: unknown) {
    const input = record(body);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
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
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  async void(userId: string, id: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    if (typeof input.reason !== 'string' || !input.reason.trim())
      validation('A reason is required to void a transaction');
    const reason = input.reason.trim();
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) notFound('Transaction not found');
    if (transaction.voidedAt) return transactionDto(transaction);
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: { voidedAt: now(), voidReason: reason },
      });
      await tx.auditEvent.create({
        data: {
          userId,
          action: 'TRANSACTION_VOIDED',
          targetId: id,
          reason,
          metadata: { kind: transaction.kind },
        },
      });
      return transactionDto(updated);
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@Req() req: AuthenticatedRequest) {
    return this.auth.logout(req.user.sub);
  }

  @Post('recovery')
  @HttpCode(202)
  recovery(@Body() body: unknown) {
    return this.auth.recovery(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.auth.me(req.user.sub);
  }
}

@Controller('transactions')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post(':id/void')
  void(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.audit.void(req.user.sub, id, key, body);
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
