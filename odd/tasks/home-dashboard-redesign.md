# Lukitas Mobile Home Dashboard Redesign

## Objective
Reshape the authenticated Inicio screen around the visual hierarchy and content grouping of the user's Rial screenshot while retaining Lukitas's own palette, product semantics, data contracts, and four-destination native navigation.

## Problem and why
The current Inicio page is a basic text-and-card overview. The user wants a more visual, mobile-first home screen inspired by the reference that also adapts to wider screens, without copying its identity.

## Authorized scope
- Redesign `DashboardScreen` for narrow mobile and wide browser/tablet layouts, with focused mobile journey assertions.
- Use the existing `DashboardDto`, `useDashboard`, and `dashboardDisclosure` behavior.
- Keep native destinations Inicio, Movimientos, Planificación, and Ajustes unchanged; preserve the contextual Informes link.
- Apply Lukitas's existing neutral/teal direction; do not copy Rial logo, assets, palette, or literal product copy.
- Keep data honest: no invented USD/EUR/USDT totals, donations, profile data, or quick-action destinations unsupported by current data/routes.
- No API/contracts/navigation redesign, new dependency, remote access, push, PR, or merge.

## Constraints and acceptance criteria
- Preserve loading/error states, base-currency balance, income/expense figures, partial-data/FX warnings, archived-account filtering, empty state, and Informes navigation.
- Follow the reference's information hierarchy: branded header, prominent balance area, income/expense summaries, account balances, and useful actions. On wide screens, use bounded columns; on phones, stack them in reading order.
- Keep controls accessible, accurately labeled, and connected only to real navigation or behavior.
- Zero new handwritten TypeScript `any`; normalize around existing DTO and design tokens; keep handwritten source below 500 lines.
- No color or asset copying from Rial. No change to the existing native tab bar.

## Execution policy
- Route: delegated direct.
- Trigger evidence: mapping required 4+ related files; implementation spans the dashboard screen and its focused journey test (2 non-trivial files), so a bounded writer is required.
- Effective TDD: off (`strict_tdd: false`) per project capability record `sdd/lukitas/testing-capabilities` and latest native-navigation tracker. Runner: `pnpm --dir apps/mobile test` (`node:test`); available checks also include mobile `typecheck` and `smoke`.
- Toolchain observed: Node 24.14.0 / pnpm 11.19.0; workspace requests Node 24.20.0 / pnpm 11.24.0. Do not install or upgrade dependencies as part of this task.
- Delivery strategy: `ask-on-risk` (default). Forecast: ~280–380 authored changed lines; review-slice budget risk appears low but is advisory. Branch point: `120f21e875b4f95e414b676df1d399945f3dbb18` (`main`).

## Tasks
- [x] HDB-01 — Build the branded, data-honest responsive Inicio dashboard composition and update focused mobile journey checks. Route: delegated direct. Work-unit commit `afe5eb3f8b08d673f041b8475b86d23585fe3a56`; native review granted, approved and acknowledged.

## Progress
- Exploration complete: the existing page is `DashboardScreen` in `apps/mobile/src/features/screens.tsx`; the underlying DTO exposes a single base-currency total, flows, warnings, and active accounts. The reference's three-tab bar conflicts with the existing four-tab product navigation and is intentionally out of scope.
- Official versioned docs consulted: [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview), [Pressable](https://reactnative.dev/docs/0.86/pressable), [accessibility](https://reactnative.dev/docs/0.86/accessibility), and [Expo SDK 57 Router Link](https://docs.expo.dev/versions/v57.0.0/sdk/router/link/). Reuse existing APIs; no dependency addition planned.
- Task document existed before this continuation. Engram recovery mirror is at `odd/home-dashboard-redesign/tasks`.
- Reconciled on resumption: prior in-scope edits were tracked in `6674495` alongside unrelated formatting; the worktree was clean. The old pending/dirty state was stale; wide-screen adaptation and verification were still needed at that point.
- User explicitly selected adapting the existing mobile Inicio to large screens, not building a standalone web dashboard. No live FX converter, historical chart, or period comparisons without their own trustworthy data contracts.
- Implemented a locally scoped dark teal/charcoal Inicio, stacked phone reading order, bounded columns from 720px, and active native-currency account balances. The four native destinations and existing data contract remain unchanged; no converter or fabricated chart was added.
- Committed the work unit as `afe5eb3f8b08d673f041b8475b86d23585fe3a56`. Native committed-only assessment from branch point: high, due (`high_risk`) because the range also contained earlier formatting in an API auth path; 31 paths/1343 lines in that cumulative range, not all attributable to this redesign. User granted candidate-scoped consent. Four native lenses completed; approved and exactly acknowledged on lineage `review-2b03a0c2a4ec2fd4` (authority burned). No delivery operation was requested.
- Nonblocking native follow-ups: R2-001 screen module concentration, R2-002 unnamed layout constants, R3-001 dashboard source-based checks lack rendered interaction proof. No correction was opened; review is terminal for the frozen candidate.
- Next step: visually verify narrow/wide layouts and native accessibility on real devices/browser; separately address the pre-existing session-recovery assertion and rendered-interaction coverage.

## Verification evidence
- `pnpm --dir apps/mobile test`: 26 passed, 1 failed. The failure is the pre-existing `session-recovery.spec.ts` line-25 source-regex mismatch with unchanged `RootNavigator.tsx`; independent verifier compared both with HEAD and reproduced the failure. Focused Inicio tests 4/4 passed. This baseline failure remains open, not hidden or treated as passing.
- `pnpm --dir apps/mobile typecheck`: passed (also independently rerun by parent); `pnpm --dir apps/mobile smoke`: passed; `pnpm gate`: passed with Node engine-version warning; `git diff --check`: passed.
- Native mobile/browser visual, screen-reader and actual viewport QA: not run in this environment; pending device verification.

## Relevant files
- `apps/mobile/src/features/screens.tsx` — responsive DashboardScreen and local dark tokens.
- `apps/mobile/src/features/home-dashboard-layout.ts` — bounded viewport layout and active-account projection.
- `apps/mobile/src/features/use-dashboard.ts` — typed dashboard retrieval and focus refresh.
- `apps/mobile/src/features/financial-disclosure.ts` — disclosure semantics for partial totals and flow.
- `apps/mobile/src/app/(tabs)/_layout.tsx` — existing four native destinations; preserve as-is.
- `apps/mobile/test/p0-journey.spec.mjs` — focused responsive, account, and contrast checks.
- `odd/tasks/native-glass-navigation.md` — current navigation/product boundary and prior validation evidence.
