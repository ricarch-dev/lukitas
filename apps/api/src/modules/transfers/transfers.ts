import { Body, Controller, Headers, Injectable, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { IdempotencyService } from '../../common/idempotency.js';
import { AppError, notFound, validation } from '../../common/errors.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { record, requiredString } from '../../common/request-input.js';
import { selectFxEvidence, type SelectedFxEvidence } from '../finance/fx-evidence.js';
import { code, convertAmount, instant, monetaryUnit, nativeAmount } from '../finance/amounts.js';

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
      evidence = await selectFxEvidence(
        this.prisma,
        sourceUnit.code,
        destinationUnit.code,
        occurredAt,
        input.manualRate,
      );
      if (!evidence)
        throw new AppError(
          'MISSING_FX_RATE',
          'A historical FX rate is required for this transfer',
          422,
        );
      destinationAmount = convertAmount(
        sourceAmount,
        sourceUnit.code,
        destinationUnit.code,
        evidence.rate,
      );
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
              create: {
                baseCode: evidence.baseCode,
                quoteCode: evidence.quoteCode,
                rate: evidence.rate,
              },
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
