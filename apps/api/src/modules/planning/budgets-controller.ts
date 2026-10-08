import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { BudgetsService } from './budgets.js';

@Controller('budgets')
@UseGuards(AuthGuard)
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return this.budgets.list(req.user.sub, month);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.budgets.get(req.user.sub, id);
  }

  @Post()
  upsert(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.budgets.upsert(req.user.sub, key, body);
  }
}
