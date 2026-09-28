import 'reflect-metadata';

import type { LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger: false | LogLevel[] =
    process.env.NODE_ENV === 'production' ? false : ['error'];
  const app = await NestFactory.create(AppModule, {
    logger,
    cors: {
      origin: ['http://localhost:19006', 'http://127.0.0.1:19006'],
    },
  });
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? '3000'), '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
