import test from 'node:test';
import assert from 'node:assert/strict';
import 'reflect-metadata';
import 'tsx/esm';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';

const { AppModule } = await import('../src/app.module.ts');
const { AuthGuard } = await import('../src/common/guards/auth.guard.ts');
const p1 = await import('../src/modules/p1.module.ts');

const routes = [
  [p1.CategoriesController, p1.CategoriesService, 'categories', [['list', RequestMethod.GET, '/'], ['create', RequestMethod.POST, '/'], ['rename', RequestMethod.PATCH, ':id'], ['archive', RequestMethod.POST, ':id/archive']]],
  [p1.BudgetsController, p1.BudgetsService, 'budgets', [['list', RequestMethod.GET, '/'], ['get', RequestMethod.GET, ':id'], ['upsert', RequestMethod.POST, '/']]],
  [p1.RecurringRulesController, p1.RecurringRulesService, 'recurring-rules', [['list', RequestMethod.GET, '/'], ['create', RequestMethod.POST, '/'], ['update', RequestMethod.PATCH, ':id'], ['catchUp', RequestMethod.POST, ':id/catch-up']]],
  [p1.ReportsController, p1.ReportsService, 'reports', [['get', RequestMethod.GET, '/']]],
];

function assertRegistration(controllers, providers) {
  const paths = new Set();
  for (const [controller, provider, path, handlers] of routes) {
    assert.equal(controllers.filter((item) => item === controller).length, 1, `${path} controller registration`);
    assert.equal(providers.filter((item) => item === provider).length, 1, `${path} provider registration`);
    assert.ok(Reflect.getMetadata(GUARDS_METADATA, controller)?.includes(AuthGuard), `${path} auth guard`);
    assert.equal(Reflect.getMetadata(PATH_METADATA, controller), path);
    for (const [name, method, route] of handlers) {
      const handler = controller.prototype[name];
      assert.equal(Reflect.getMetadata(METHOD_METADATA, handler), method);
      assert.equal(Reflect.getMetadata(PATH_METADATA, handler), route);
      const signature = `${path}/${route}:${method}`;
      assert.ok(!paths.has(signature), `duplicate /v1/${signature}`);
      paths.add(signature);
    }
  }
}

test('P1 providers and guarded routes remain registered exactly once in AppModule', () => {
  assertRegistration(p1.p1Controllers, p1.p1Providers);
  assertRegistration(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule), Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule));
});

test('P1 registration detects missing provider, duplicate route, and removed guard', () => {
  assert.throws(() => assertRegistration(p1.p1Controllers, p1.p1Providers.filter((item) => item !== p1.BudgetsService)), /budgets provider registration/);
  assert.throws(() => assertRegistration([...p1.p1Controllers, p1.BudgetsController], p1.p1Providers), /budgets controller registration/);
  const guard = Reflect.getOwnMetadata(GUARDS_METADATA, p1.BudgetsController);
  try {
    Reflect.deleteMetadata(GUARDS_METADATA, p1.BudgetsController);
    assert.throws(() => assertRegistration(p1.p1Controllers, p1.p1Providers), /budgets auth guard/);
  } finally {
    Reflect.defineMetadata(GUARDS_METADATA, guard, p1.BudgetsController);
  }
});
