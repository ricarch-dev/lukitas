import { PrismaService } from '../common/prisma.js';
import { IdempotencyService } from '../common/idempotency.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { AuthController, AuthService } from './auth/auth.js';
import { AuditController, AuditService } from './audit/audit.js';
import { AccountsController, AccountsService } from './accounts/accounts.js';
import { DashboardController, DashboardService } from './dashboard/dashboard.js';
import { OnboardingController, OnboardingService } from './onboarding/onboarding.js';
import { TransfersController, TransfersService } from './transfers/transfers.js';

export {
  AuthController,
  AuthService,
  AuditController,
  AuditService,
  DashboardController,
  DashboardService,
  OnboardingController,
  OnboardingService,
  TransfersController,
  TransfersService,
};

export const p0Providers = [
  PrismaService,
  IdempotencyService,
  AuthService,
  OnboardingService,
  AccountsService,
  TransfersService,
  AuditService,
  DashboardService,
  AuthGuard,
];

export const p0Controllers = [
  AuthController,
  OnboardingController,
  AccountsController,
  TransfersController,
  AuditController,
  DashboardController,
];
