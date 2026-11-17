# Debts and loans

Objective: Implement the approved first version of debts/payables and loans/receivables with cross-currency settlements. Branch: `feat/debts-and-loans`; baseline: `0f1a38842b93d2f8c6bf275691e2269e9e999a4f`.
Delivery: feature-branch-chain (local commits only); forecast approximately 2,000 authored changed lines, sliced by coherent behavior, not a hard line cap. Runners: Node test, workspace TypeScript, isolated SQLite API tests.

## Specs

- S1: Approved proposal: **“Deudas y préstamos”**, with **“Por pagar”** and **“Por cobrar”**; “Persona o entidad”, “Concepto, monto y moneda”, “Fecha y vencimiento opcional”, “Saldo pendiente e historial de pagos”.
- S2: “registrar abonos parciales”, “indicando desde qué cuenta pagaste o en cuál recibiste el dinero”; “pendiente, vencido o saldado”. Check exact outstanding principal, ownership, atomic cash postings, settlement history, and dates in the user's timezone.
- S3: **“El dinero se mueve ahora”** generates an account movement; **“Es una deuda anterior”** records outstanding principal without moving account money again. “El capital prestado y sus devoluciones quedarían separados de ingresos y gastos.” Check both directions and unchanged ordinary reports.
- S4: “En Inicio mostraríamos **‘Debés’** y **‘Te deben’**, separados de tu dinero disponible y agrupados por moneda. Desde el ‘+’ podrías registrar una deuda o un préstamo.” Preserve existing four tabs and native/web navigation.
- S5: User selected **“Permitir otra moneda”**: “Cada abono puede usar otra moneda, indicando la tasa y cuánto reduce la deuda. Requiere más controles y pruebas.” The account determines cash currency; an explicit rate converts one account-currency unit into debt-currency units; preview and persist rounded debt reduction and rate. No implicit double conversion.
- S6: Deferred scope: “cuotas automáticas, intereses calculados y recordatorios.” No editing/voiding debt events in this first version; reject principal reversal through the ordinary transaction void endpoint to preserve paired records. Reject overpayment rather than silently creating a new obligation.

## Tasks

- T1 [S1,S2,S5] inline / verified: exact domain rules and canonical contracts; RED missing module, GREEN 4 focused tests and 80 domain tests, domain/contracts typechecks pass; commit pending. Risk: none for new isolated rules.
- T2 [S1,S2,S3,S5,S6] inline / pending: additive SQLite persistence, protected/idempotent debt API, exact settlements and principal ledger classification, API regression tests and docs; commit pending. Risk: items 1,2,3,4 (migration, owner isolation, shared reporting contract, concurrent settlement).
- T3 [S1,S2,S3,S4,S5,S6] inline / pending: mobile debt list/create/payment/history, dashboard summaries, quick action and route, focused tests and docs; commit pending. Risk: item 3 if shared consumers change; assess actual diff.
- T4 [S1-S6] independent verifier / pending: whole-feature isolated proof after own checks; named risks in T2. Full suites/builds delegated as per-action bounded verification. Native assessment per work unit; no publishing.

## Log

- L1 (2026-11-16): User authorization verbatim: “Si empecemos con eso”. It accepts the immediately preceding first-version proposal quoted in S1-S6.
- L2 (2026-11-16): User choice verbatim: “Permitir otra moneda”.
- L3 (2026-11-16): User delivery choice verbatim: “Una rama, cambios encadenados”. No remote operations or PR creation authorized.
- L4: Read-only mapping found canonical exact decimal/money code, signed ledger entries, active SQLite migration chain distinct from PostgreSQL history, and reports assuming ordinary income/expense. CodeGraph unavailable; used filesystem evidence. Route: parent writes inline; no independent parallel write units or context-backstop trigger holds.
- L5: Implementation assumptions: cash amount always uses the selected account currency; explicit debt-currency-per-cash-currency rate for cross-currency events; overpayment rejected; existing debt entry represents the amount still outstanding on its recorded date. Existing obligations close through payments only. Preserve principal history as immutable in this slice.
- L6: Documentation checked: Prisma 7.10.0 adapter README and config via Context7; NestJS official controllers documentation (rolling v12, exact tagged Context7 query unavailable); verify installed signatures. SDK 58 native tabs docs and installed screens declarations checked earlier. Never apply migrations to the user's database for tests.
- L7: T1 reuses Money/FxRate/decimal primitives, adds no dependency or stored data. Public exports are additive. No differential CLI check applies: no existing CLI/option/parser changed. Native/runtime boundary N/A for pure rules. Rollback: remove debts domain/contracts modules and their additive exports/tests.
