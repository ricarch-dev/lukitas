import 'reflect-metadata';

import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

@Controller()
class HealthController {
  @Get('health')
  async health() {
    await prisma.$queryRawUnsafe('SELECT 1');
    return { ok: true, database: 'up' as const };
  }
}

@Module({ controllers: [HealthController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? '3000');

  await app.listen(port, '0.0.0.0');
}

bootstrap().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
