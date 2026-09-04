import { Module } from '@nestjs/common';
import { p0Controllers, p0Providers } from './modules/p0.module.js';
import { HealthController } from './common/health.js';
import { p1Controllers, p1Providers } from './modules/p1.module.js';

@Module({
  controllers: [HealthController, ...p0Controllers, ...p1Controllers],
  providers: [...p0Providers, ...p1Providers],
})
export class AppModule {}
