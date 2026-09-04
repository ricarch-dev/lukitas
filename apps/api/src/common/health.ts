import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('health')
  async health() {
    await this.prisma.$queryRawUnsafe('SELECT 1');
    return { ok: true, database: 'up' as const };
  }
}
