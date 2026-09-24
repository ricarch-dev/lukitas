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
import type { AuthenticatedRequest } from '../common/types.js';
import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { AppError, notFound, validation } from '../common/errors.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { record, requiredString } from '../common/request-input.js';
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
  nativeAmount,
  now,
  transactionDto,
  type StoredDecimal,
} from './p0-finance.js';

type AccountView = {
  id: string;
  name: string;
  currency: { code: string; precision: number };
  openingBalance: StoredDecimal;
  archivedAt: Date | null;
};

export const accountDto = (account: AccountView, balance: string) => {
  const unit = monetaryUnit(account.currency.code);
  return {
    id: account.id,
    name: account.name,
    currency: { code: unit.code, precision: unit.precision },
    openingBalance: fixedAmount(account.openingBalance, unit.precision),
    balance: fixedAmount(balance, unit.precision),
    archived: Boolean(account.archivedAt),
  };
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idem: IdempotencyService,
  ) {}

  private async find(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
      include: { currency: true },
    });
    if (!account) notFound('Account not found');
    return account;
  }

  private async balance(account: Pick<AccountView, 'id' | 'openingBalance'>): Promise<string> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId: account.id, transaction: { voidedAt: null } },
      select: { signedAmount: true },
    });
    return entries.reduce(
      (total, entry) => addDecimal(total, asString(entry.signedAmount)),
      asString(account.openingBalance),
    );
  }

  async list(userId: string, includeArchived = false) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      include: { currency: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      accounts.map(async (account) => accountDto(account, await this.balance(account))),
    );
  }

  async create(userId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const name = requiredString(input.name, 'Account name is required');
    const currencyCode = code(input.currencyCode);
    const openingBalance = nativeAmount(input.openingBalance, currencyCode, 'non-negative');
    await this.prisma.currency.upsert({
      where: { code: currencyCode },
      create: currencyData(currencyCode),
      update: currencyData(currencyCode),
    });
    const account = await this.prisma.account.create({
      data: { userId, name, currencyCode, openingBalance },
      include: { currency: true },
    });
    const result = accountDto(account, openingBalance);
    await this.idem.save(userId, key, body, result);
    return result;
  }

  async update(userId: string, id: string, body: unknown) {
    await this.find(userId, id);
    const input = record(body);
    const name = requiredString(input.name, 'Account name is required');
    const account = await this.prisma.account.update({
      where: { id, userId },
      data: { name },
      include: { currency: true },
    });
    return accountDto(account, await this.balance(account));
  }

  async archive(userId: string, id: string, key: string | undefined) {
    const body = { id };
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const account = await this.find(userId, id);
    if (account.archivedAt) return { archived: true };
    const updated = await this.prisma.account.update({
      where: { id, userId },
      data: { archivedAt: now() },
    });
    const result = { id: updated.id, archived: true };
    await this.idem.save(userId, key, body, result);
    return result;
  }

  async transaction(userId: string, accountId: string, key: string | undefined, body: unknown) {
    const replay = await this.idem.replay(userId, key, body);
    if (replay) return replay;
    const input = record(body);
    const account = await this.find(userId, accountId);
    if (account.archivedAt)
      throw new AppError('ACCOUNT_ARCHIVED', 'Archived accounts cannot receive new transactions');
    const kind = input.kind;
    if (kind !== 'INCOME' && kind !== 'EXPENSE') validation('kind must be INCOME or EXPENSE');
    const currencyCode = code(input.currencyCode === undefined ? account.currencyCode : input.currencyCode);
    const amount = nativeAmount(input.amount, currencyCode, 'positive');
    const occurredAt = instant(input.occurredAt);
    let categoryId: string | null = null;
    if (input.categoryId !== undefined) {
      if (typeof input.categoryId !== 'string') validation('categoryId must be a string');
      const category = await this.prisma.category.findFirst({
        where: { id: input.categoryId, userId, archivedAt: null },
      });
      if (!category) throw new AppError('NOT_FOUND', 'Active category not found', 404);
      categoryId = category.id;
    }
    let baseAmount = amount;
    let evidence: SelectedFxEvidence | null = null;
    if (currencyCode !== account.currencyCode) {
      if (!categoryId)
        throw new AppError(
          'CURRENCY_MISMATCH',
          'Only categorized transactions may use another currency',
        );
      evidence = await selectFxEvidence(this.prisma, currencyCode, code(account.currencyCode), occurredAt, input.manualRate);
      if (!evidence)
        throw new AppError('MISSING_FX_RATE', 'A historical FX rate is required for this transaction', 422);
      baseAmount = convertAmount(amount, currencyCode, evidence.quoteCode, evidence.rate);
      await this.prisma.currency.upsert({
        where: { code: currencyCode },
        create: currencyData(currencyCode),
        update: currencyData(currencyCode),
      });
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const ownedAccount = await tx.account.findFirst({
        where: { id: accountId, userId, archivedAt: null },
      });
      if (!ownedAccount) notFound('Account not found');
      if (categoryId) {
        const ownedCategory = await tx.category.findFirst({
          where: { id: categoryId, userId, archivedAt: null },
        });
        if (!ownedCategory) notFound('Active category not found');
      }
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          kind,
          amount,
          currencyCode,
          occurredAt,
          note: typeof input.note === 'string' ? input.note.trim() : null,
          categoryId,
        },
      });
      const signedAmount = kind === 'EXPENSE' ? `-${baseAmount}` : baseAmount;
      await tx.ledgerEntry.create({
        data: { transactionId: transaction.id, accountId, signedAmount },
      });
      if (evidence)
        await tx.transactionFxSnapshot.create({
          data: {
            transactionId: transaction.id,
            sourceCurrency: currencyCode,
            baseCurrency: account.currencyCode,
            sourceAmount: amount,
            baseAmount,
            rate: evidence.rate,
            effectiveAt: evidence.effectiveAt,
            source: evidence.source,
          },
        });
      return transactionDto(transaction);
    });
    await this.idem.save(userId, key, body, result);
    return result;
  }
}

@Controller('accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get() list(
    @Req() req: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.accounts.list(req.user.sub, includeArchived === 'true');
  }

  @Post() create(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.accounts.create(req.user.sub, key, body);
  }

  @Patch(':id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.accounts.update(req.user.sub, id, body);
  }

  @Post(':id/archive') archive(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return this.accounts.archive(req.user.sub, id, key);
  }

  @Post(':id/transactions') transaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.accounts.transaction(req.user.sub, id, key, body);
  }
}
