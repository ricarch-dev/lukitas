## Exploration: USDT monetary unit

### Current State
USDT-01 is complete at `5fc5de405eaf1b5a4a02e76b61bae11a163ea56c`: the shared domain recognizes supported 3–4 letter monetary-unit codes, declares active USDT metadata at six-decimal precision, and the Prisma schema/migration widen the existing currency columns. The product scope is a manually tracked, network-agnostic balance; it does not introduce blockchain, custody, network, or live-price semantics.

USDT-02 (API precision and financial flows) is partially implemented in the dirty working tree and remains unverified and uncommitted. Current source introduces/reuses canonical monetary metadata and exact decimal helpers for account, transaction, transfer, dashboard and related API paths; its current behavior and tests still need reconciliation and verification. USDT-03 (mobile selection and integrated journey) is pending. The existing ODD task document is the detailed source for requirements, acceptance criteria, checks and work-unit history.

### Affected Areas
- `odd/tasks/usdt-monetary-unit.md` — authoritative scope and progress record; USDT-01 complete, USDT-02 partial, USDT-03 pending.
- `packages/domain/src/monetary-unit.ts` and `packages/domain/test/monetary-unit.test.ts` — canonical supported-unit metadata and focused tests; already dirty, preserve and reconcile.
- `packages/domain/src/index.ts` — public domain exports for shared monetary metadata; already dirty.
- `apps/api/src/modules/p0-finance.ts` — current financial helpers and shared metadata usage; already dirty.
- `apps/api/src/modules/p0-monetary.ts` — untracked API monetary/flow implementation; preserve and inspect before extending.
- `apps/api/src/modules/accounts.ts` and `apps/api/src/modules/p0.module.ts` — account paths and API module wiring touched by the partial implementation; already dirty.
- Existing API tests and future mobile account/onboarding screens — verify USDT precision and financial behavior; complete mobile selection and display only in USDT-03.

### Approaches
1. **Resume the recorded work units** — reconcile and verify the existing USDT-02 changes first, then implement the pending mobile USDT-03 journey against the same canonical metadata.
   - Pros: Preserves the reviewed USDT-01 boundary and existing in-progress work; aligns with scoped acceptance criteria and avoids duplicating completed work.
   - Cons: Requires careful review of partial/unverified edits before treating them as correct.
   - Effort: Medium to High.

2. **Restart the feature implementation** — discard/rewrite the partial API work and revisit the full end-to-end scope.
   - Pros: Could provide a clean implementation baseline if the partial changes prove unsalvageable.
   - Cons: Risks destroying user work, duplicating USDT-01, and broadening scope without evidence that a restart is needed.
   - Effort: High.

### Recommendation
Use the first approach. Do not repeat or rewrite committed USDT-01. Inspect the current USDT-02 diff and tests, finish and verify its financial-flow acceptance criteria, and keep USDT-03 as a separate focused work unit. Preserve all unrelated dirty changes, including `.github/workflows/ci.yml` and the ODD task document. Do not claim the partial API work is complete until its required checks pass.

### Risks
- The dirty USDT-02 implementation is explicitly unverified; six-decimal correctness, exact arithmetic, conversion rounding, historical FX snapshots, missing-rate behavior and tests must be confirmed before delivery.
- API correctness alone does not complete the feature: mobile selection, account creation and display remain pending in USDT-03.
- Review workload is material: the task record forecasts roughly 650–900 authored changed lines across three work units, above the 400-line review budget; retain coherent, reviewable slices and avoid collapsing them into one change.

### Ready for Proposal
Yes. The scope and key decisions are clear from the task record and current source. Proposal should frame this as resuming the existing change—not redoing USDT-01—and explicitly sequence unverified USDT-02 reconciliation/verification before pending USDT-03, while preserving existing work and the network-agnostic manual-balance constraint.
