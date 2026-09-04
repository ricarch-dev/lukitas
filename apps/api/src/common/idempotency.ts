import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.js';
import { AppError } from './errors.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}
  fingerprint(body: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(body ?? null))
      .digest('hex');
  }
  async replay(
    userId: string,
    key: string | undefined,
    body: unknown,
  ): Promise<unknown | undefined> {
    if (!key) return undefined;
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!existing) return undefined;
    if (existing.fingerprint !== this.fingerprint(body))
      throw new AppError(
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key was used with a different command',
        409,
      );
    return existing.response;
  }
  async save(
    userId: string,
    key: string | undefined,
    body: unknown,
    response: unknown,
  ): Promise<void> {
    if (!key) return;
    await this.prisma.idempotencyKey.create({
      data: { userId, key, fingerprint: this.fingerprint(body), response: response as object },
    });
  }
}
