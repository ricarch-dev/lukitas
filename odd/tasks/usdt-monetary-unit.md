# USDT Monetary Unit

## Objective

Support manually tracked, network-agnostic USDT balances throughout Lukitas without introducing blockchain wallet, network, contract, custody, or real-time crypto-price semantics.

## Problem and why

The current monetary model rejects `USDT` as a four-character code, persists currency references in `VARCHAR(3)` columns, duplicates precision defaults across API modules, and hardcodes two-decimal presentation in selected flows. Users therefore cannot represent a core Venezuelan balance type consistently or include it in existing FX, transfer, budget, and reporting behavior.

## Authorized scope

- Broaden the existing monetary-unit code invariant to admit uppercase `USDT` while preserving current fiat codes.
- Treat USDT as a generic manual balance with six display/accounting decimals.
- Widen existing PostgreSQL currency-code columns through a new migration and seed active USDT metadata.
- Establish one canonical currency metadata/precision source and remove touched duplicate defaults.
- Preserve historical FX snapshots and the existing `1 BASE = rate QUOTE` convention.
- Expose USDT through the existing contracts/API/mobile account and onboarding flows where currency selection exists or is required.
- Add focused tests and migration evidence for USDT amounts, FX, transfers, budgets, reports, and missing-rate behavior.

## Out of scope

- Blockchain networks, token contracts, wallet addresses, custody, imports, transaction hashes, and network fees.
- Real-time cryptocurrency prices, investment performance, tax calculations, or bank synchronization.
- BCV provider ingestion, voice/AI entry, and unrelated Rial parity work.
- Push, pull request creation, merge, release, or deployment.

## Constraints

- Zero handwritten TypeScript `any`.
- Domain invariants belong in `packages/domain`; shared boundary shapes belong in `packages/contracts`.
- Monetary persistence remains exact decimal; no binary floating point.
- Existing migrations are immutable; schema evolution uses a new migration.
- Handwritten files should remain below 500 lines and must not exceed 800 lines.
- Technical artifacts remain in English.

## Product decisions

- USDT semantics: manually tracked, network-agnostic monetary unit.
- USDT ledger/display precision: six decimals; this is not a claim about arbitrary on-chain atomic precision.
- Delivery strategy: `ask-on-risk`.
- Forecast: approximately 650-900 authored changed lines across three coherent work units; chained delivery is expected.
- Chain strategy: `stacked-to-main` (previously selected and retained for this feature).
- First reviewed/delivery boundary: branch point `7b1ec4d`.

## Test mode

- Effective TDD: disabled.
- Source: Engram observation `sdd/lukitas/testing-capabilities`.
- Ordinary functional checks are still required per task.
- Runtime: Node `24.20.0`, pnpm `11.24.0`.

## Checklist

- [x] **USDT-01 — Canonical monetary unit and persistence**
  - Broaden and rename the domain code invariant without weakening uppercase validation.
  - Define canonical metadata for USD, EUR, VES, GBP, and USDT, including six-decimal USDT precision.
  - Update shared contract wording/types to describe supported monetary-unit codes rather than ISO-only codes.
  - Widen every physical currency-code column through a new Prisma migration and seed USDT idempotently.
  - Keep domain, Prisma schema, migration, and focused tests in the same work-unit commit.
  - Acceptance: `Currency.of("USDT", 6)` succeeds; invalid/lowercase codes fail; schema and migration contain no active three-character currency limit; existing fiat rows remain compatible.
  - Checks: domain typecheck/tests, contracts typecheck, Prisma validate/generate, migration structural test.
  - Evidence: canonical domain metadata and code validation, structural contract typing, Prisma `VARCHAR(4)` schema alignment, one 14-column widening migration, active USDT upsert, and focused domain/schema tests are included in the USDT-01 work-unit commit.

- [ ] **USDT-02 — API precision and financial flows**
  - Replace touched duplicate precision/default maps with the canonical monetary metadata owner.
  - Ensure account creation, transactions, FX snapshots/rates, transfers, budgets, recurrences, dashboards, and reports preserve six-decimal USDT amounts.
  - Remove hardcoded two-decimal presentation where it contradicts currency metadata.
  - Preserve partial-total and missing-rate behavior; never invent a zero conversion.
  - Keep behavior tests with the implementation commit.
  - Acceptance: USDT/USD and USDT/VES flows round only at the target unit precision; historical snapshots remain immutable; mixed-currency totals remain explainable.
  - Checks: API typecheck/tests plus focused P0/P1 journeys.
  - Evidence: pending.

- [ ] **USDT-03 — Mobile selection and integrated journey**
  - Remove USD-only onboarding/account assumptions in the touched path and offer supported active monetary units including USDT.
  - Render USDT amounts with canonical precision and expose native totals/warnings needed to understand consolidated balances.
  - Add or update mobile/integration coverage for a manual USDT account and transaction journey.
  - Acceptance: a user can select USDT, create the tracked balance, and see native and converted values without any network/custody implication.
  - Checks: mobile typecheck/tests/export smoke and full workspace verification.
  - Evidence: pending.

## Applicable final checks

- `pnpm --dir packages/domain typecheck`
- `pnpm --dir packages/domain test`
- `pnpm --dir packages/contracts typecheck`
- `pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma`
- `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`
- `pnpm --dir apps/api typecheck`
- `pnpm --dir apps/api test`
- `pnpm --dir apps/mobile typecheck`
- `pnpm --dir apps/mobile test`
- `pnpm test:all`
- `pnpm gate`

## Context evidence

- Prisma ORM 7 documentation confirms `String @db.VarChar(n)` maps to bounded PostgreSQL `VARCHAR(n)` and supports create-only migrations with reviewed custom SQL.
- Tether documents USD₮ across multiple protocols, but this feature deliberately models an interchangeable economic balance rather than a protocol-specific token holding.
- The Lukitas MVP specification excludes real-time cryptocurrency pricing and custody while requiring exact decimal storage, historical FX reproducibility, partial totals for missing rates, and fast manual entry.
- No relevant Lukitas database connection is configured in DBeaver; repository schema and migrations are authoritative for this work.

## Progress and next step

- Branch created: `feat/usdt-monetary-unit` from `7b1ec4d`.
- Next: implement USDT-01 with focused verification and close it as a Conventional Commit work unit.
