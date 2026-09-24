# Proposal: USDT Monetary Unit

## Intent

Resume the existing USDT change so users can manually track a USDT balance across accounts, financial flows, and mobile without treating it as a blockchain wallet. The reviewed USDT-01 foundation is already committed at `5fc5de4`; USDT-02 is partially implemented but unverified and uncommitted, and USDT-03 remains pending. The goal is to finish and validate those remaining work units, not restart the feature.

## Scope

### In Scope

- Preserve the completed USDT-01 foundation: supported four-character monetary-unit codes, canonical active USDT metadata with six-decimal precision, widened currency-code persistence, and shared contract support.
- Reconcile and complete the existing dirty USDT-02 API work: reuse canonical metadata and exact-decimal arithmetic across account creation, transactions, FX snapshots/rates, transfers, budgets, recurrences, dashboards, and reports. Round to the target unit's precision, preserve historical FX snapshots and `1 BASE = rate QUOTE`, and retain explainable partial totals when rates are missing.
- Complete USDT-03 mobile account/onboarding selection and display, including native totals and missing-rate warnings, with focused manual USDT journey coverage.
- Verify the remaining work units with their recorded package checks and integrated workspace checks before claiming completion; keep implementation and tests together in reviewable work units under the 400-line review heuristic.

### Out of Scope

- Blockchain networks, contracts, addresses, custody, imports, transaction hashes, and network fees.
- Live crypto prices, investment/tax calculations, bank synchronization, BCV ingestion, voice/AI entry, and unrelated Rial parity work.
- Reimplementing USDT-01, changing already-applied migrations, or performing remote delivery, deployment, or release as part of this proposal.

## Capabilities

No existing capability specs are present in `openspec/specs/`; these are new capability specifications, including the already-delivered foundation as baseline behavior.

### New Capabilities

- `monetary-unit-support`: Supported codes, canonical metadata, six-decimal USDT precision, contract compatibility, and four-character persistence (USDT-01 baseline).
- `usdt-financial-flows`: Exact USDT amounts and conversions across API financial flows, historical FX snapshots, target-precision rounding, and missing-rate/partial-total behavior (USDT-02).
- `usdt-mobile-journey`: Selection and presentation of a manually tracked USDT account in onboarding and mobile account/transaction journeys (USDT-03).

### Modified Capabilities

None.

## Approach

Treat the committed USDT-01 boundary as the foundation. Inspect and preserve the current USDT-02 diff, including the untracked API module; normalize touched precision and validation behavior around `packages/domain` metadata and existing contracts rather than adding a second source of truth. Reconcile API tests and run the recorded API/P0/P1 checks before marking USDT-02 complete. Then implement USDT-03 against the same supported-unit metadata and verify the mobile journey and full workspace. Keep the work units separately reviewable; do not interpret dirty edits or a prior foundation review as verification of the API or mobile work.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/domain/src/monetary-unit.ts`, `packages/domain/src/index.ts`, `packages/domain/test/monetary-unit.test.ts` | Existing/Modified | Preserve committed metadata and reconcile dirty canonical exports/tests. |
| `packages/contracts/src/` and `apps/api/prisma/` | Existing | USDT-01 contract and persistence baseline; no migration rewrite. |
| `apps/api/src/modules/accounts.ts`, `apps/api/src/modules/p0-finance.ts`, `apps/api/src/modules/p0-monetary.ts`, `apps/api/src/modules/p0.module.ts` | Modified/New | Preserve and complete the partial API financial-flow implementation and wiring. |
| `apps/api/test/` | Modified | Focused precision, FX, missing-rate, and financial-flow coverage. |
| `apps/mobile/` | Modified | Supported-unit selection, precision-aware display, and integrated manual USDT journey. |
| `odd/tasks/usdt-monetary-unit.md` | Existing | Authoritative work-unit history and acceptance/check record; preserve dirty edits. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Partial USDT-02 code silently rounds, converts, or reports incorrectly. | High | Review the existing diff and cover target precision, historical snapshots, missing rates, and mixed-unit totals before verification claims. |
| Changes overwrite user work or unrelated dirty files. | Medium | Preserve the current working tree, especially untracked `apps/api/src/modules/p0-monetary.ts`, the ODD document, tests, and `.github/workflows/ci.yml`; inspect before editing. |
| A single delivery exceeds the 400-line review budget. | High | Retain coherent USDT-02 and USDT-03 review slices; the foundation was already reviewed separately. |
| API support is mistaken for an end-to-end feature. | Medium | Require mobile selection/display and integrated journey checks before final acceptance. |

## Rollback Plan

Keep USDT-01 and its migration intact. If USDT-02 or USDT-03 fails, pause that work unit and revert only its own changes using an inspected diff, preserving all pre-existing dirty/untracked files and unrelated edits; never blanket-reset the working tree or remove the committed widening migration. If deployed behavior ever requires rollback, disable or revert only the affected API/mobile behavior after confirming persisted USDT data remains readable under the widened schema.

## Dependencies

- Existing reviewed USDT-01 commit `5fc5de4` and the authoritative acceptance/check history in `odd/tasks/usdt-monetary-unit.md`.
- Successful reconciliation of unverified USDT-02 behavior before depending on it for USDT-03.

## Success Criteria

- [ ] USDT-01 remains intact, including four-character persistence and active six-decimal canonical metadata.
- [ ] USDT-02 passes its API typecheck/tests and focused P0/P1 financial journeys with exact amounts, target-unit rounding, immutable historical FX snapshots, and explicit missing-rate/partial-total behavior.
- [ ] USDT-03 lets a user select USDT, create a manual account and transaction, and see correctly formatted native/converted values and applicable warnings without network or custody implications.
- [ ] Mobile typecheck/tests/export smoke and full workspace checks pass before the change is described as complete; dirty unrelated changes remain untouched.
