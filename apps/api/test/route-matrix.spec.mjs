import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import 'reflect-metadata';
import 'tsx/esm';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';

const source = readFileSync(join(import.meta.dirname, '..', 'src', 'main.ts'), 'utf8');
const { AppModule } = await import('../src/app.module.ts');
const {
  p0Controllers,
  p0Providers,
  AuthController,
  AuthService,
  AuditController,
  AuditService,
  OnboardingController,
  TransfersController,
  DashboardController,
} = await import('../src/modules/p0.module.ts');
const { AccountsController, AccountsService } = await import('../src/modules/accounts.ts');
const { AuthGuard } = await import('../src/common/guards/auth.guard.ts');
const { OnboardingService, TransfersService, DashboardService } =
  await import('../src/modules/p0-monetary.ts');

const protectedRoutes = [
  [OnboardingController, OnboardingService, 'onboarding', [
    ['complete', RequestMethod.POST, '/'],
    ['get', RequestMethod.GET, '/'],
  ]],
  [AccountsController, AccountsService, 'accounts', [
    ['list', RequestMethod.GET, '/'],
    ['create', RequestMethod.POST, '/'],
    ['update', RequestMethod.PATCH, ':id'],
    ['archive', RequestMethod.POST, ':id/archive'],
    ['transaction', RequestMethod.POST, ':id/transactions'],
  ]],
  [TransfersController, TransfersService, 'transfers', [['create', RequestMethod.POST, '/']]],
  [AuditController, AuditService, 'transactions', [['void', RequestMethod.POST, ':id/void']]],
  [DashboardController, DashboardService, 'dashboard', [['get', RequestMethod.GET, '/']]],
];

const authRoutes = [
  ['register', RequestMethod.POST, 'register'],
  ['login', RequestMethod.POST, 'login'],
  ['refresh', RequestMethod.POST, 'refresh'],
  ['logout', RequestMethod.POST, 'logout'],
  ['recovery', RequestMethod.POST, 'recovery'],
  ['me', RequestMethod.GET, 'me'],
];

function assertProtectedRegistration(controllers, providers) {
  assert.equal(
    controllers.filter((registered) => registered === AuthController).length,
    1,
    'auth controller registration',
  );
  assert.equal(providers.filter((registered) => registered === AuthService).length, 1);
  assert.equal(providers.filter((registered) => registered === AuthGuard).length, 1);
  assert.equal(Reflect.getMetadata(PATH_METADATA, AuthController), 'auth');
  for (const [name, method, route] of authRoutes) {
    const handler = AuthController.prototype[name];
    assert.equal(
      Reflect.getMetadata(METHOD_METADATA, handler),
      method,
      `auth/${name} HTTP method`,
    );
    assert.equal(Reflect.getMetadata(PATH_METADATA, handler), route, `auth/${name} route`);
    if (name === 'logout' || name === 'me') {
      assert.ok(Reflect.getMetadata(GUARDS_METADATA, handler)?.includes(AuthGuard), `auth/${name} auth guard`);
    }
  }
  for (const [controller, provider, path, routes] of protectedRoutes) {
    assert.equal(
      controllers.filter((registered) => registered === controller).length,
      1,
      `${path} controller registration`,
    );
    assert.equal(
      providers.filter((registered) => registered === provider).length,
      1,
      `${path} provider registration`,
    );
    assert.equal(Reflect.getMetadata(PATH_METADATA, controller), path);
    assert.ok(
      Reflect.getMetadata(GUARDS_METADATA, controller)?.includes(AuthGuard),
      `${path} auth guard`,
    );
    for (const [name, method, route] of routes) {
      const handler = controller.prototype[name];
      assert.equal(Reflect.getMetadata(METHOD_METADATA, handler), method, `${path}/${name} HTTP method`);
      assert.equal(Reflect.getMetadata(PATH_METADATA, handler), route, `${path}/${name} route`);
    }
  }
}

test('API exposes a versioned prefix while preserving the health probe', () => {
  assert.match(source, /setGlobalPrefix\(['"]v1['"]/);
  assert.match(source, /exclude:\s*\[['"]health['"]\]/);
});

test('extracted financial controllers and providers are registered once with guarded /v1 routes', () => {
  assertProtectedRegistration(p0Controllers, p0Providers);
  const appControllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule);
  const appProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule);
  assertProtectedRegistration(appControllers, appProviders);
});

test('registration checks reject missing providers, duplicate controllers, and unguarded moved controllers', () => {
  assert.throws(
    () => assertProtectedRegistration(
      p0Controllers,
      p0Providers.filter((provider) => provider !== TransfersService),
    ),
    /transfers provider registration/,
  );
  assert.throws(
    () => assertProtectedRegistration([...p0Controllers, DashboardController], p0Providers),
    /dashboard controller registration/,
  );
  const originalGuards = Reflect.getOwnMetadata(GUARDS_METADATA, TransfersController);
  try {
    Reflect.deleteMetadata(GUARDS_METADATA, TransfersController);
    assert.throws(() => assertProtectedRegistration(p0Controllers, p0Providers), /transfers auth guard/);
  } finally {
    Reflect.defineMetadata(GUARDS_METADATA, originalGuards, TransfersController);
  }
});
