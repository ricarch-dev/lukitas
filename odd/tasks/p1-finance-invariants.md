# P1 Finance Invariants

## Objective

Close the two warnings left by P1 verification while preserving exact-decimal and user-timezone semantics.

## Problem

- Account creation accepts `"0"` as an opening balance but rejects equivalent decimal-zero strings such as `"0.00"`.
- Monthly range calculation has two implementations with different upper-bound semantics: the API uses the exclusive start of the next month, while the domain helper returns the start of the final day.

## Why

Equivalent decimal representations must behave consistently, and all monthly reports must share one timezone-aware `[from, to)` boundary to avoid dropping the final day or duplicating transactions.

## Scope

- Normalize zero-opening-balance validation without weakening positive transaction validation.
- Make the domain package the canonical owner of timezone-aware monthly boundaries and reuse it from the API.
- Add focused regression coverage for decimal-zero variants and month boundaries, including a DST-sensitive timezone.
- Align the local verification runtime with the versions already pinned by the repository when the available tooling permits it.

## Constraints

- No handwritten TypeScript `any` may be introduced; touched paths should remove relevant existing `any` where practical.
- Monetary values remain exact decimal strings.
- Monthly ranges use an inclusive lower bound and exclusive upper bound.
- Technical artifacts remain in English.
- No deployment, push, pull request, or merge is authorized.

## Authorized Scope

- `odd/tasks/p1-finance-invariants.md`
- `package.json` and runtime metadata only if required to honor the existing Node/pnpm pins
- `packages/domain/src/planning.ts` and its focused tests/exports
- `apps/api/src/modules/p0.module.ts`
- `apps/api/src/modules/p1.module.ts`
- Focused API/domain tests needed to prove the fixes
- Minimal canonical helper modules required to avoid duplicate validation or boundary logic

## TDD and Delivery

- TDD mode: disabled
- TDD source: existing `sdd-init/lukitas` project capability record
- Test runner: ordinary focused package tests plus `pnpm test:all` and `pnpm gate`
- Delivery strategy: `ask-on-risk`
- Forecast: approximately 120 authored changed lines; one PR slice expected
- RDD mode at start: on (global)
- Initial reviewed boundary: `9da2612`

## Tasks

- [x] **P1FI-01 — Accept equivalent decimal zero opening balances**
  - Add a focused regression test showing `"0"`, `"0.0"`, and `"0.00"` are accepted for opening balances while negative or malformed values remain rejected.
  - Reuse or introduce a narrowly owned exact-decimal validator; do not weaken `positiveAmount` for transaction amounts.
  - Acceptance: account creation stores and returns the zero amount at currency precision.
  - Checks: focused API test, API typecheck/test, changed-path `any` scan.
  - Implementation: `AccountsService.create` validates an `unknown` request body with an account-owned opening-balance validator, canonicalizes equivalent decimal zeros to `"0"` for persistence, defaults an omitted value to canonical zero, and returns the amount at currency precision. `positiveAmount` remains unchanged.
  - Refactoring rationale: the account service, controller, account DTO, and opening-balance validator moved to `apps/api/src/modules/accounts.ts`; reusable P0 monetary primitives moved once to `apps/api/src/modules/p0-finance.ts`. This preserves feature ownership and module wiring without arbitrary line splitting or duplicate validation.
  - Final line counts: `p0.module.ts` 578; `accounts.ts` 284; `p0-finance.ts` 103; `accounts.spec.mjs` 105. Every touched handwritten source file is below the 800-line absolute ceiling, and each extracted file is below the 500-line refactoring signal.
  - Verification: focused account test passed (15/15); API test passed (22/22); API typecheck passed; `git diff --check` passed; no new TypeScript `any`, duplicate opening-balance validator/account DTO, or provider/controller wiring regression was found.
  - Formatter evidence: formatting enforcement is unavailable and non-blocking because the repository has `.prettierrc.json` but no Prettier dependency, executable, script, CI step, or gate enforcement. No formatter was installed or downloaded; existing style and `git diff --check` were used.
  - Runtime harness: the focused account service scenario accepted `"0.00"` and an omitted opening balance, persisted canonical zero, returned `"0.00"` for USD precision, and rejected negative, malformed, number-typed, null, and whitespace-padded values.
  - Rollback boundary: revert `apps/api/src/modules/accounts.ts`, `apps/api/src/modules/p0-finance.ts`, the account imports/wiring changes in `apps/api/src/modules/p0.module.ts`, and `apps/api/test/accounts.spec.mjs`; no schema or P1FI-02 behavior is involved.
  - Commit evidence: pending parent readback.
  - RDD outcome: completed after corrective verification.

- [ ] **P1FI-02 — Canonicalize timezone-aware monthly boundaries**
  - Correct the domain helper to return `[start of month, start of next month)` in the requested timezone.
  - Remove the API duplicate and reuse the domain implementation with explicit API error translation where needed.
  - Add focused UTC and DST-sensitive boundary tests, including December-to-January rollover.
  - Acceptance: budgets/reports include the complete month and exclude the next month consistently.
  - Checks: focused domain/API tests, `pnpm test:all`, `pnpm gate`, changed-path duplication and `any` scan.
  - Commit evidence: pending.
  - RDD outcome: pending.

## Progress

- Exploration confirmed the API currently special-cases only the exact string `"0"`.
- Exploration confirmed the API boundary is correct and exclusive, while the exported domain boundary ends at the start of the final day.
- The repository already pins pnpm `11.24.0`; the current shell has pnpm `11.24.0` and Node `24.14.0`, while Node `24.20.0` is required.

## Verification Evidence

- P1FI-01 executable checks passed. Formatter enforcement is unavailable and non-blocking because Prettier is not installed or referenced by repository scripts, CI, or gates.

## Next Step

Commit the completed `P1FI-01` work unit before starting `P1FI-02`.
