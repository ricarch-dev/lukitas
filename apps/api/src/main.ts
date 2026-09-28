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
  const port = Number(process.env.PORT ?? '3000');
  await app.listen(port, '0.0.0.0');
  if (process.env.NODE_ENV !== 'production') {
    const localUrl = new URL(await app.getUrl());
    localUrl.hostname = 'localhost';
    console.info(`API listening at ${localUrl.origin}/v1`);
    console.info(`Health check: ${localUrl.origin}/health (checks database on request)`);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
