# Native Glass Navigation — First Prototype

## Objective and problem
Replace the dashboard's local three-button switch with four real native destinations: Inicio, Movimientos, Planificación, Ajustes. Informes opens contextually from Inicio. The current decorative actions imply flows that do not exist, and the English Rial-inspired surface conflicts with Lukitas's teal identity.

## Why and scope
Deliver the smallest functional Expo SDK 57 native-tab prototype for iOS and Android. Preserve session restoration, authentication and onboarding, dashboard figures and partial-balance/FX warnings. Show real account and movement data where available; do not fabricate balances, actions or reports. No backend changes, unrelated dependency upgrades, remote operations or copied Rial assets.

## Constraints and acceptance
- iOS 26+ uses the system native Liquid Glass tab appearance when built on a compatible device; older iOS and Android use platform-native tab bars. Device appearance cannot be certified on Windows/Expo Go alone.
- Four persistent tabs have matching routes, localized labels, meaningful screens and no nonfunctional quick-action controls. Informes is reached from Inicio and returns normally.
- Auth/onboarding are outside the tabs; sign-out remains reachable. Errors, empty states, partial totals and FX warnings are honest and accessible.
- Source files prefer <500 lines (800 hard), zero handwritten TypeScript `any`, reuse canonical DTOs and brand tokens. Tests cover navigation wiring and financial semantics.
- Foreground checks: `pnpm --dir apps/mobile test`, `pnpm --dir apps/mobile typecheck`, `pnpm --dir apps/mobile smoke`, `pnpm gate`, `git diff --check`. Native device QA remains pending without Mac/iPhone.

## Execution policy and forecast
Route: delegated direct (trigger: 2+ non-trivial files); one bounded writer implemented the coupled migration. Delivery: ask-on-risk; ~400 authored additions + deletions per task is advisory, never code-golf. Forecast: NAV-01 180–300, NAV-02 280–460, NAV-03 180–320, total ~640–1080 authored lines. Running authored lines: 599 (including tracker, excluding generated lockfile); one coupled migration work unit exceeds 400, defer any PR slicing decision to user. TDD off per `sdd/lukitas/testing-capabilities` (`strict_tdd: false`); focused runner `pnpm --dir apps/mobile test`.

## Tasks (stable IDs)
- [x] NAV-01: Install only SDK-compatible router prerequisites; migrate entry and auth/onboarding gate to file routes and native four-tab shell. Linked to NAV-02/03 in one compilable migration commit; checks below.
- [x] NAV-02: Replace custom dashboard bar/false actions with brand-consistent Inicio, real recent movement list and contextual report; retain partial and warning semantics. Tests below, same work unit.
- [x] NAV-03: Make Planificación and Ajustes honest, typed and usable; repair route-dependent tests. Checks below, same work unit.
- [x] NAV-04 (R3-001, bounded follow-up): The `/auth/me` error gate previously exposed only Retry, so a permanently rejected session could not reach Ajustes to sign out. Kept Retry and the existing onboarding decision; added a clearly labeled, accessible route back to login that clears only session tokens through the existing session boundary. Route: delegated direct to the sole writer on `feat/native-glass-navigation`. Rollback boundary: the root error gate, focused test and this NAV-04 evidence only; no backend or other feature behavior.

## Evidence
NAV-01/02/03 are coupled by route imports and land together; rollback boundary is the mobile route entry, dependency set, four screens and their tests, without API files. Behavior, tests and plan commit: `88e735b` (`feat(mobile): add native four-tab finance navigation`). Evidence-record commit: see Git history for this follow-up document change.

- `pnpm --dir apps/mobile test`: pass, 22/22 (after fixing two stale route assertions and one contrast-test assumption).
- `pnpm --dir apps/mobile typecheck`: pass, `tsc --noEmit`.
- `pnpm --dir apps/mobile smoke`: pass, web export; Node DEP0190 warning from existing smoke harness.
- `pnpm gate`: pass; workspace gate is not the entire package test suite.
- `git diff --check` and staged diff check: pass (line-ending notices only).
- Initial pnpm install succeeded but subsequent automatic workspace postinstall failed: Prisma requires unavailable `DATABASE_URL`. Recovered local dependency links via `pnpm install --offline --ignore-scripts --frozen-lockfile`; no API process or credential used. Node 24.14.0 differs from workspace 24.20.0 requirement.
- SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/ ; https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/ ; https://docs.expo.dev/router/installation/ . Native tabs provide platform-native iOS 26 glass and Android navigation; `expo-glass-effect` is not directly required. Android physical QA, iOS 26 compatible build/device visual, safe areas and glass verification remain pending (Windows host).

### NAV-04 (R3-001) follow-up evidence
- `apps/mobile/src/navigation/RootNavigator.tsx` preserves Retry and the onboarding gate, and offers an accessible "Volver a iniciar sesión" action using `setTokens(null)` via `session-recovery.ts`. `sessionStorage.write(null)` deletes only `lukitas.session.v1`; it does not clear account or other device data.
- `apps/mobile/test/session-recovery.spec.ts` exercises token-only clearing against the storage adapter and checks the error-gate action wiring. Focused runtime boundary: Node test of storage behavior; a rendered navigation test is unavailable in the existing Node-only harness. R3-002 remains non-blocking for later rendered-navigation coverage. Device UI QA remains pending.
- `pnpm --dir apps/mobile test`: pass, 24/24.
- `pnpm --dir apps/mobile typecheck`: pass, `tsc --noEmit`.
- `pnpm --dir apps/mobile smoke`: pass, web export; existing Node DEP0190 warning.
- `pnpm gate`: pass; Node 24.14.0 versus required 24.20.0 warning.
- `git diff --check`: pass; Git LF-to-CRLF notices only.
- React Native 0.86 accessibility/Pressable docs: https://reactnative.dev/docs/0.86/accessibility and https://reactnative.dev/docs/0.86/pressable . No dependency changes.
