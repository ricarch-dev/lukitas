import {
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { IdempotencyService } from '../../common/idempotency.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { validation } from '../../common/errors.js';
import { record, requiredString } from '../../common/request-input.js';
import { code, currencyData, nativeAmount } from '../finance/amounts.js';

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
