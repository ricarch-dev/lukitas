# Lukitas Mobile Home Dashboard Redesign

## Objective
Reshape the authenticated Inicio screen around the visual hierarchy and content grouping of the user's Rial screenshot while retaining Lukitas's own palette, product semantics, data contracts, and four-destination native navigation.

## Problem and why
The current Inicio page is a basic text-and-card overview. The user wants a more visual, mobile-first home screen modeled on the reference layout, explicitly without copying its colors.

## Authorized scope
- Redesign only `DashboardScreen` and its focused mobile journey assertions.
- Use the existing `DashboardDto`, `useDashboard`, and `dashboardDisclosure` behavior.
- Keep native destinations Inicio, Movimientos, Planificación, and Ajustes unchanged; preserve the contextual Informes link.
- Apply Lukitas's existing neutral/teal direction; do not copy Rial logo, assets, palette, or literal product copy.
- Keep data honest: no invented USD/EUR/USDT totals, donations, profile data, or quick-action destinations unsupported by current data/routes.
- No API/contracts/navigation redesign, new dependency, remote access, push, PR, or merge.

## Constraints and acceptance criteria
- Preserve loading/error states, base-currency balance, income/expense figures, partial-data/FX warnings, archived-account filtering, empty state, and Informes navigation.
- Visually follow the reference's hierarchy: branded header, prominent balance area, compact useful shortcuts, paired income/expense summaries, and horizontally browsable real account balances where the current DTO supports them.
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
- [ ] HDB-01 — Build the branded, data-honest Inicio dashboard composition and update focused mobile journey checks. Route: delegated direct. Acceptance and checks above. Work-unit commit and native review assessment: pending.

## Progress
- Exploration complete: the existing page is `DashboardScreen` in `apps/mobile/src/features/screens.tsx`; the underlying DTO exposes a single base-currency total, flows, warnings, and active accounts. The reference's three-tab bar conflicts with the existing four-tab product navigation and is intentionally out of scope.
- Official versioned docs consulted: [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview), [Pressable](https://reactnative.dev/docs/0.86/pressable), [accessibility](https://reactnative.dev/docs/0.86/accessibility), and [Expo SDK 57 Router Link](https://docs.expo.dev/versions/v57.0.0/sdk/router/link/). Reuse existing APIs; no dependency addition planned.
- Task document written before source changes. Engram mirror: pending; `mem_save` rejected the write because multiple active runtime sessions match this project and no authoritative session ID is available.
- HDB-01 source and focused-test edits are present in `screens.tsx` and `p0-journey.spec.mjs`, but checks, commit, and RDD assessment have not run. The delegated writer confirms it changed only those two files.
- Verification paused: `git status` also reports uncommitted changes across API and other mobile files that were absent at the initial clean baseline and whose provenance is unconfirmed. They have been preserved and not staged. Do not overwrite or include them without the user's direction.
- Next step: confirm ownership/intent of the newly visible unrelated worktree changes, then resume focused verification, commit the HDB-01 work unit, and assess it under enabled RDD mode.

## Verification evidence
- Pending: `pnpm --dir apps/mobile test`, `pnpm --dir apps/mobile typecheck`, `pnpm --dir apps/mobile smoke`, `pnpm gate`, and `git diff --check`. The two in-scope implementation/test edits have not yet been verified.

## Relevant files
- `apps/mobile/src/features/screens.tsx` — redesigned DashboardScreen and local styles (verification pending).
- `apps/mobile/src/features/use-dashboard.ts` — typed dashboard retrieval and focus refresh.
- `apps/mobile/src/features/financial-disclosure.ts` — disclosure semantics for partial totals and flow.
- `apps/mobile/src/app/(tabs)/_layout.tsx` — existing four native destinations; preserve as-is.
- `apps/mobile/test/p0-journey.spec.mjs` — updated focused mobile journey assertions (verification pending).
- `odd/tasks/native-glass-navigation.md` — current navigation/product boundary and prior validation evidence.
