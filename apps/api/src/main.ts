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
  if (process.env.NODE_ENV !== 'production') {
    app.use(
      (
        request: { method: string; route?: { path?: unknown } },
        response: { statusCode: number; once: (event: 'finish', listener: () => void) => void },
        next: () => void,
      ) => {
        const started = process.hrtime.bigint();
        response.once('finish', () => {
          const template = request.route?.path;
          const route =
            typeof template === 'string' &&
            /^\/(?:[a-zA-Z0-9_-]+|:[a-zA-Z0-9_]+)(?:\/(?:[a-zA-Z0-9_-]+|:[a-zA-Z0-9_]+))*\/?$/.test(template)
              ? template
              : '<unmatched>';
          const method = /^[A-Z]+$/.test(request.method) ? request.method : '<unknown>';
          const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
          console.info(`api.response ${method} ${route} ${response.statusCode} ${durationMs.toFixed(2)}ms`);
        });
        next();
      },
    );
  }
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
