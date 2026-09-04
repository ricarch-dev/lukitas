import { Module } from '@nestjs/common';
import { p0Controllers, p0Providers } from './modules/p0.module.js';
import { HealthController } from './common/health.js';

@Module({ controllers: [HealthController, ...p0Controllers], providers: p0Providers })
export class AppModule {}
