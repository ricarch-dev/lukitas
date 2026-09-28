# Mobile Rial-inspired dashboard

## Objective
Replace the authenticated mobile dashboard with a polished, Rial-inspired financial overview using the existing dashboard API contract.

## Problem
The current dashboard is a minimal text view and does not provide the clear balance hierarchy, income/expense summary, account cards, quick actions, or mobile navigation shown in the supplied references.

## Why
The user explicitly requested that the app's initial front resemble the two Rial dashboard references.

## Authorized scope
- Redesign the authenticated dashboard only.
- Reuse `DashboardDto` from `@lukitas/contracts`; do not change API endpoints or add dependencies.
- Preserve access to Planning, Reports, and sign-out.
- Use self-contained React Native primitives and text/emoji markers because the app has no installed icon or SVG library.

## Constraints
- Source/UI artifacts remain in English unless existing context requires otherwise.
- No `any`; normalize against existing contracts.
- Keep handwritten source files below 500 lines.
- No remote work, dependency additions, push, PR, or merge.
- TDD mode: unresolved. `pnpm tdd:readiness` could not run because local Node is 24.19.0 and pnpm is 11.19.0, while the workspace requires Node 24.20.0 and pnpm 11.24.0. Runner: `pnpm --dir apps/mobile test` once the required toolchain is available.

## Delivery
- Forecast: ~260 authored changed lines; strategy: ask-on-risk.
- Running authored lines: 186 (source and focused test; task document excluded).
- Current branch: `fix/api-decorator-metadata`. Creating a dedicated branch was unavailable because the workspace cannot create `.git/refs/heads/*.lock` under the current sandbox.

## Tasks
- [x] MBD-1 — Create a typed, Rial-inspired dashboard screen and render it from the current feature boundary. Route: delegated direct. Trigger: implementation spans two non-trivial files (dashboard UI and focused journey test); preparation/mapping delegated. Evidence: `DashboardDto` now types `/dashboard`; the screen has balance hierarchy, currency chips, quick actions, income/expense cards, account cards, bottom navigation, Planning, Reports, and sign-out.
- [x] MBD-2 — Run the available mobile typecheck, focused tests, and smoke test; record exact results. Route: inline verification. Evidence: `pnpm --dir apps/mobile typecheck` passed; `pnpm --dir apps/mobile test` passed 15/15; `pnpm --dir apps/mobile smoke` passed after sandbox escalation was needed to read an installed Expo module. `git diff --check` passed; no `any` remains in the dashboard path.

## Progress
- Exploration: complete. Existing data is sufficient in `/dashboard` and `DashboardDto`; no endpoint change is needed.
- Commit evidence: pending work-unit commit `feat(mobile): redesign dashboard overview`.
- Rollback boundary: revert the dashboard UI and focused journey assertions in `apps/mobile/src/features/screens.tsx` and `apps/mobile/test/p0-journey.spec.mjs`; onboarding, API and contracts remain independent.
