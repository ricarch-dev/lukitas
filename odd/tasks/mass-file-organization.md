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
- [ ] ORG-03 — Migrate Auth and Onboarding from the flat features area.
  - Route: delegated direct writer.
  - Checks: mobile typecheck and auth/onboarding tests.
- [ ] ORG-04 — Migrate Dashboard-adjacent and remaining mobile screens; update route/navigation imports and path-sensitive fixtures.
  - Route: delegated direct writer.
  - Checks: mobile typecheck, full mobile tests, smoke, and route-source tests.
- [ ] ORG-05 — Move standalone API capabilities and extract shared account mapping without changing behavior.
  - Route: delegated direct writer.
  - Checks: API typecheck, tests, build, and smoke.
- [ ] ORG-06 — Split P0/P1 implementations into concentrated capability files and retire obsolete implementation aggregation.
  - Route: delegated direct writer.
  - Checks: API typecheck, tests, build, smoke, and dynamic-import/registration tests.
- [ ] ORG-07 — Repository-wide cleanup, stale-reference scan, final validation, and task evidence update.
  - Route: delegated direct verification plus parent spot check.
  - Checks: `pnpm check:workspace`; `pnpm test:smoke`; `pnpm test:domain`; `pnpm test:all`; `pnpm gate`.

## Progress

- Status: ORG-01 and ORG-02 complete; ORG-03 next.
- Current route: delegated direct, one writer at a time.
- Forecast: large refactor; keep work grouped by behavior-preserving boundary rather than by file type.
- Baseline preserved: pre-existing mobile edits remain in `apps/mobile/src/modules/accounts/screens/accounts-screen.tsx`, `apps/mobile/src/modules/home/components/balance-summary.tsx`, `apps/mobile/src/modules/home/presentation/balance-summary.ts`, and related mobile tests.
- Environment note: the parent `pnpm --dir apps/mobile typecheck` rerun was interrupted with `^C`; direct TypeScript compilation passed, and the delegated writer observed the pnpm wrapper passing before handoff.
- Commit evidence: pending; no commit authorization was provided.

## Verification evidence

To be filled after each task with exact command and observed result. Failed, unavailable, skipped, and pending checks must remain explicit.

## Next step

Complete ORG-03 and ORG-04 to remove the remaining mobile capability implementation from `features/`, then split the API implementation facades.
