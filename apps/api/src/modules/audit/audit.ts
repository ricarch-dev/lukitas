import {
  Body,
  Controller,
  Headers,
  Injectable,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { PrismaService } from '../../common/prisma.js';
import { IdempotencyService } from '../../common/idempotency.js';
import { AppError, notFound, validation } from '../../common/errors.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { record } from '../../common/request-input.js';
import { now, transactionDto } from '../finance/amounts.js';

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
