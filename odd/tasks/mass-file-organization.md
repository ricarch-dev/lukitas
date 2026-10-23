# Mass File Organization

## Objective

Move Lukitas from its split-brain file layout to a concentrated capability-oriented monorepo structure while preserving route names, API behavior, public package boundaries, and existing tests.

## Problem

The mobile app still has a flat `apps/mobile/src/features` area while `modules/home` and `modules/accounts` have already started the target organization. The API also concentrates multiple capabilities in `p0.module.ts`, `p0-monetary.ts`, and `p1.module.ts`. Some API code bypasses the public `@lukitas/contracts` package export.

## Scope

- Migrate mobile feature implementation into `apps/mobile/src/modules/<capability>/`.
- Keep `apps/mobile/src/app/` as route declarations and layouts only.
- Keep `navigation/`, `session/`, and `api/` as application infrastructure.
- Move genuinely cross-capability theme/presentation code into focused shared owners only where current consumers prove sharing.
- Split API implementations by capability while retaining temporary registration facades until all consumers and tests are updated.
- Repair package-boundary imports and exports.
- Update path-sensitive tests and preserve route URLs, platform-specific storage resolution, API endpoints, and behavior.

## Constraints

- No new dependencies.
- No `any` in handwritten TypeScript.
- Preserve NodeNext `.js` relative specifiers in API source where they remain relative.
- Use kebab-case for new filenames; avoid unrelated mass renames.
- Do not move generated files, Prisma migrations, lockfiles, or vendored code.
- Do not add empty architectural layers or speculative shared utilities.
- No commit or push was requested; leave commits pending unless explicitly authorized.

## Authorized edit surfaces

- `apps/mobile/src/app/**`
- `apps/mobile/src/features/**`
- `apps/mobile/src/modules/**`
- `apps/mobile/src/navigation/**`
- `apps/mobile/src/shared/**`
- `apps/mobile/src/session/**`
- `apps/mobile/src/api/**`
- `apps/mobile/test/**`
- `apps/api/src/modules/**`
- `apps/api/src/common/**`
- `apps/api/src/app.module.ts`
- `apps/api/package.json`
- `apps/api/test/**`
- `packages/contracts/src/**`
- `pnpm-lock.yaml` (package-manager-generated dependency metadata only)
- `odd/tasks/mass-file-organization.md`

## Acceptance criteria

1. No mobile production import references `apps/mobile/src/features` after migration; the legacy directory is removed when its implementation is empty.
2. Every mobile route file remains under `apps/mobile/src/app` and retains its existing route path and default export behavior.
3. Mobile capability code is owned by `apps/mobile/src/modules/<capability>/` with only needed `screens`, `components`, `hooks`, `actions`, `presentation`, and `styles` directories.
4. API P0/P1 implementation is split into capability-owned files without changing endpoint paths, provider behavior, or exported registration contracts.
5. `@lukitas/contracts` consumers use the package public export instead of reaching into `packages/contracts/src` by relative path.
6. `packages/domain` remains framework-independent and `packages/contracts` remains the canonical cross-boundary shape owner.
7. Focused tests, package type checks, app type checks/builds, workspace checks, smoke tests, and the repository gate pass, or failures are recorded honestly.
8. No new TypeScript `any`, unsafe source bypass, or duplicate canonical business type is introduced.

## Tasks

- [x] ORG-01 — Repair contracts public exports and API boundary imports.
  - Route: delegated direct writer.
  - Outcome: exported the dashboard contract surface, replaced deep source imports, and declared `@lukitas/contracts` as an API workspace dependency.
  - Checks: `pnpm --dir packages/contracts typecheck` passed; `pnpm --dir apps/api typecheck` passed; `git diff --check` passed; final source diff contains only the intended import changes.
- [x] ORG-02 — Consolidate mobile shared ownership and complete Home/Accounts module migration.
  - Route: delegated direct writer.
  - Outcome: moved shared theme, dashboard data/presentation, Home styles, and Accounts styles out of the flat feature area; updated production consumers and path-sensitive fixtures while preserving existing Cuentas/Inicio behavior changes.
  - Checks: writer observed `pnpm --dir apps/mobile typecheck` passed, `pnpm --dir apps/mobile test` passed with 46/46, `pnpm --dir apps/mobile smoke` passed, stale-path scan passed, and mobile `git diff --check` passed. Parent spot-check: direct `tsc --noEmit -p apps/mobile/tsconfig.json` passed and confirmed no stale legacy path references. A parent rerun of the pnpm wrapper was interrupted by the environment with `^C`, so that wrapper rerun is recorded as interrupted rather than passed.
- [x] ORG-03 — Migrate Auth and Onboarding from the flat features area.
  - Route: inline fallback after delegated workers were blocked by the runtime permission flow; user explicitly authorized the fallback.
  - Outcome: moved Auth and Onboarding screens, presentation logic, and submit actions into `modules/auth` and `modules/onboarding`; updated `RootNavigator`, removed the legacy barrel exports, and updated path-sensitive tests.
  - Checks: direct Node test runner passed 46/46; direct TypeScript compilation passed; direct mobile smoke passed; stale Auth/Onboarding path scan passed; `git diff --check` passed. The `pnpm --dir apps/mobile test` and typecheck wrappers were interrupted by the environment with `^C`, so they are recorded as interrupted rather than passed.
- [x] ORG-04 — Migrate Dashboard-adjacent and remaining mobile screens; update route/navigation imports and path-sensitive fixtures.
  - Route: inline fallback authorized after runtime delegation permissions were exhausted.
  - Outcome: moved Dashboard, Accounts creation, Movements, Planning, Reports, and Settings into capability modules; updated route declarations and fixtures; removed all production/test references to `features/` and left the legacy directory empty.
  - Checks: direct Node test runner passed 46/46; direct TypeScript compilation passed; direct mobile smoke passed; stale `features/` path scan passed; `git diff --check` passed. The first run exposed and the correction fixed one stale `p0-journey` path fixture.
- [x] ORG-05 — Move standalone API capabilities and extract shared account mapping without changing behavior.
  - Route: inline fallback authorized after runtime delegation permissions were exhausted.
  - Outcome: moved Accounts, Budgets, Dashboard timezone/valuation, FX evidence, and monetary helpers into capability-owned directories; extracted `account-mapper.ts` so Dashboard no longer depends on the Accounts service implementation.
  - Checks: `pnpm --dir apps/api typecheck` passed; API build passed; API smoke passed; focused API behavior suite passed before and after mapper extraction. The full API suite reached 88/89; the only failure is the pre-existing Prisma 7.10.0 ANSI-output expectation in `test/prisma-config.spec.mjs`.
- [x] ORG-06 — Split P0/P1 implementations into concentrated capability files and retire obsolete implementation aggregation.
  - Route: inline fallback authorized after runtime delegation permissions were exhausted.
  - Outcome: reduced `p0.module.ts`, `p0-monetary.ts`, and `p1.module.ts` to registration/re-export facades; moved Auth, Audit, Onboarding, Transfers, Dashboard, Categories, Budgets controller, Recurring Rules, Reports, and planning support into capability-owned files while preserving route and provider exports.
  - Checks: API typecheck passed; API build passed; API smoke passed; route/provider registration tests passed; full API suite reached 88/89 with only the known Prisma ANSI-output test failure.
- [x] ORG-07 — Repository-wide cleanup, stale-reference scan, final validation, and task evidence update.
  - Route: inline final verification with parent review.
  - Outcome: completed workspace checks, domain checks, mobile/API smoke, gate, stale-reference scans, typechecks, diff check, and task evidence updates; preserved the known external Prisma output assertion failure without changing unrelated tests.
  - Checks: recorded in `Verification evidence` below.

## Progress

- Status: ORG-01 through ORG-07 complete; implementation finished with one pre-existing API test limitation recorded.
- Current route: delegated direct where available; controlled inline fallback authorized after runtime delegation permissions were exhausted.
- Forecast: large refactor completed; all work remained grouped by behavior-preserving boundary rather than file type.
- Baseline preserved: pre-existing mobile edits remain in `apps/mobile/src/modules/accounts/screens/accounts-screen.tsx`, `apps/mobile/src/modules/home/components/balance-summary.tsx`, `apps/mobile/src/modules/home/presentation/balance-summary.ts`, and related mobile tests.
- Environment notes: mobile pnpm wrappers for typecheck/test were interrupted with `^C`; direct mobile compilers/tests/smoke passed. API full tests are 88/89 because Prisma 7.10.0 emits ANSI styling that defeats one existing literal-output assertion. Node reports the repository engine warning because the runtime is v24.14.0 while manifests require v24.20.0.
- Engram mirror: pending because the runtime permission flow exhausted approval rounds for `mem_save`; the local task document is authoritative for this session.

## Verification evidence

- `pnpm check:workspace` — passed.
- `pnpm test:domain` — passed, 76/76.
- `pnpm test:smoke` — passed for mobile and API.
- `pnpm gate` — passed.
- Mobile direct Node suite — passed, 46/46; direct TypeScript compilation and smoke passed.
- API typecheck — passed; API build and smoke passed.
- API suite — 88/89 passed; `test/prisma-config.spec.mjs` remains blocked by the existing literal `/Generated Prisma Client/` assertion against Prisma 7.10.0 ANSI-styled output.
- Final stale-path scan — no references to mobile `features/` or retired API module paths.
- Final `git diff --check` — passed.

Failed, unavailable, skipped, and pending checks remain explicit above; no known failure was hidden by changing unrelated tests.

## Next step

ORG-07 is complete: review the final diff, decide whether to authorize a commit, and separately address the pre-existing Prisma ANSI-output assertion if desired.
