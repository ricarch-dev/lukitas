# Design: Continue USDT Monetary-Unit Support

## Technical Approach

Complete the unverified USDT-02 API work, including P1 budgets, recurring rules, and reports, before implementing USDT-03 mobile entry and presentation. Reuse the reviewed USDT-01 foundation at `5fc5de4`; do not repeat its implementation, modify its migration, or introduce blockchain semantics. USDT remains an independent, manually tracked unit with six accounting/display decimals, not a USD alias.

This design implements the three local capability specs: [monetary-unit-support](specs/monetary-unit-support/spec.md) is the delivered foundation and regression boundary; [usdt-financial-flows](specs/usdt-financial-flows/spec.md) defines API acceptance; [usdt-mobile-journey](specs/usdt-mobile-journey/spec.md) defines the pending user journey. The proposal, exploration, and `odd/tasks/usdt-monetary-unit.md` supply continuation history, not evidence that dirty code passes.

**Phase boundary:** this phase writes only this document. All source/test paths below are planned implementation changes. Preserve the existing dirty domain/API files, untracked `apps/api/src/modules/p0-monetary.ts`, dirty ODD tracker, and unrelated `.github/workflows/ci.yml`. No commits, remote operations, dependency installation, or database mutation are part of this phase. Use the supplied native OpenSpec artifact locator; do not re-detect the store from the generic session preflight.

### Current-source findings

| Area | Observed state | Required continuation |
|---|---|---|
| Domain | `monetary-unit.ts` already defines active USD/EUR/VES/GBP at two decimals and USDT at six; dirty changes harden unknown inputs and freeze metadata. `Money`, `FxRate`, and bigint decimal primitives already exist. | Reconcile the dirty hardening and tests; reuse existing arithmetic instead of creating another implementation. |
| P0 | Dirty `accounts.ts` uses canonical metadata; `p0-monetary.ts` contains onboarding, transfers, dashboard, and controllers; `p0.module.ts` imports/re-exports them. | Preserve the extraction and finish validation, exact serialization, FX evidence, and tests. |
| Arithmetic | `p0-finance.ts` contains a separate bigint parser/quantizer. Its `fixedAmount` rounds output, while some writes retain unnormalized input. `asString` coerces arbitrary values. | Separate untrusted validation, persisted Decimal serialization, and target rounding. One accepted native amount must drive both storage and response. |
| P1 | `p1.module.ts` is 635 lines; its validator accepts only three letters, metadata includes unsupported defaults, and budget progress uses `fixed(..., 2)`. It contains handwritten `any`. | Extract monetary services before extending them; remove duplicated metadata/arithmetic and type the touched boundaries. |
| Aggregates | Dashboard flow uses the same `take: 50` query as recent activity. Budget/report conversion uses recorded matching snapshots, not live prices. | Separate full-period flow calculation from the activity limit; retain intentionally different missing-evidence policies. |
| Contracts | `DashboardDto.flow` declares only income/expense although dirty API output includes partial/warnings. Budget/report DTOs already express partial evidence and affected IDs. | Add the missing flow fields; reuse existing DTOs rather than mobile-local copies. |
| Mobile | Onboarding hardcodes USD twice; dashboard omits native accounts; report hides native totals/warning details. No account/transaction entry surface exists in `screens.tsx`. `RootNavigator` does not observe successful onboarding. | Add small entry components, canonical selection/formatting, typed responses, native totals, and a success-only completion callback. |
| Tests | Account/month tests execute services, but route and mobile journey tests largely inspect source text. P0 guard tests assume all controllers remain in `p0.module.ts`. | Preserve wiring checks while adding actual financial behavior tests; source matches are not journey evidence. |

CodeGraph supplied source and dependencies for monetary helpers, accounts, onboarding, transfers, dashboard, contracts, and navigation. Several focused P1/mobile queries returned unrelated or trimmed sections; targeted reads supplied the missing implementation and test details. No implementation verification was run in this design phase.

## Architecture Decisions

### Decision 1: Keep canonical metadata in the domain and database rows as its projection

**Choice:** Retain `SUPPORTED_MONETARY_UNITS`, `SupportedMonetaryUnitCode`, and `getSupportedMonetaryUnit` as the single product catalog. API validation first requires a supported string code and then an active unit. Currency upserts use the canonical code, precision, and active fields. Mobile imports the same catalog and filters active entries; no catalog endpoint is needed for this static set.

**Alternatives considered:** Separate mobile/API precision maps; accepting arbitrary syntactically valid codes with precision two; database-driven product activation.

**Rationale:** The foundation distinguishes valid code syntax from supported units. Reusing it prevents USDT/USD aliasing and the P1 fallback defect. Database `Currency` rows remain persistence references, not a second independently editable product catalog. Unknown persisted codes must fail explicitly rather than receive invented precision. This does not add BTC/JPY support merely because old fallback maps mentioned them.

### Decision 2: Validate native amounts once; round only computed target money

**Choice:** Reuse domain `Money`, `Currency`, `FxRate`, and existing decimal primitives. Keep `p0-finance.ts` as the API monetary adapter despite its historical name; remove its duplicate parser/rounder and P1's duplicate arithmetic. Export only the existing decimal primitives needed for exact aggregate addition/formatting from the domain entry point, without duplicating their implementations.

API amounts/rates remain strings. Opening balances accept non-negative values and omitted zero; transaction amounts, limits, and supplied fees remain positive. For new native writes, reject a value not exactly representable at the selected unit's precision; redundant trailing zeros may be removed losslessly. Do not silently round a positive sub-unit amount into zero. Rates are separately positive and are not money: retain their full representable rate scale. Convert accepted source money with `FxRate.of(base, quote, rate).convert(source, 'HALF_UP')`; ties round away from zero at the target precision.

**Alternatives considered:** Retaining duplicated bigint helpers; `Number`, `parseFloat`, or numeric `toFixed`; truncating source values; rounding rates to six/two decimals.

**Rationale:** Existing domain types already enforce direction, sign, zero, and explicit rounding. Normalizing only the response would permit the stored ledger and visible balance to disagree. Rejecting unrepresentable new native input is an intentional validation tightening, not a rewrite of old rows. Existing valid fiat amounts and six-decimal USDT amounts retain their values.

**Storage boundary:** Amount columns are `Decimal(20,8)` and rate columns are `Decimal(24,12)`, each allowing at most twelve integral digits. Validate individual persisted values, including converted results, before writes; reject overflow and nonzero fractional rate digits beyond twelve rather than letting PostgreSQL silently change financial evidence. Canonical native precision is stricter than the amount column scale. Aggregate display is not constrained to a single-row storage range. The mobile spec's `9007199254740993.123456` is a formatter fixture, not a request to widen storage.

On reads, a narrow adapter accepts trusted `string | Prisma.Decimal` values and emits plain decimal text (`Decimal.toFixed()` without a rounding scale), never `String(unknown)` or `Number`. This also protects small rates from exponent-form `toString()` output. Existing persisted high-scale native values are not rewritten: reads/aggregates use exact stored values and explicitly format their result to canonical precision; do not apply new-write rejection retroactively.

### Decision 3: Preserve two distinct FX policies and immutable write evidence

**Choice:** Rate-dependent writes use a supplied positive manual rate or the latest stored direct pair with `effectiveAt <= occurredAt`. No automatic parity, reverse lookup, or triangulation is introduced. Resolve and validate before financial postings; absence produces existing `MISSING_FX_RATE`/422. Preserve transaction, ledger, snapshot, and transfer amounts in the existing Prisma transaction boundaries.

Store the selected direction, rate, source, and monetary result. For new historical-rate snapshots, preserve the selected rate row's `source` and `effectiveAt`; for a supplied manual rate, use `MANUAL` and the operation instant. Keep `occurredAt` separately on the financial operation. Do not rewrite existing snapshots, whose effective time was previously populated with the operation time. The transfer's existing `FxSnapshot`/`FxSnapshotRate` relations are sufficient; no new snapshot schema is required.

**Alternatives considered:** Assuming USDT equals USD; repricing historical operations with current rates; treating every database-selected rate as `MARKET`; recomputing saved results on reads.

**Rationale:** A historical row can itself have a manual source. Exact copied evidence must survive later rate insertion and catalog changes. Current-balance valuation and historical accounting are different questions; sharing decimal conversion does not justify merging their evidence policies.

| Consumer | Evidence selection | Missing behavior |
|---|---|---|
| Account/onboarding/same-unit posting | Native amount; no FX | No FX dependency. |
| Cross-unit transaction/transfer | Explicit manual rate, otherwise eligible direct historical rate | Reject before financial writes; no partial ledger or snapshot. |
| Dashboard balance total | Native base amount, otherwise eligible direct rate at period end | Keep known base subtotal, `partial: true`, pair warnings, and every native account balance. |
| Dashboard period flow | Native base amount, matching transaction snapshot, otherwise eligible direct historical rate at transaction time | Keep known income/expense subtotals, flow partial/warnings, and native recent activity. |
| Budget/report history | Native amount or matching stored transaction snapshot only | Budget keeps partial progress plus warnings/IDs. Report keeps native totals and warnings/IDs but omits `baseTotal`. Never fill the gap with current prices. |

Same-unit/empty totals are real zero values at canonical precision, not missing conversions. Dashboard balance and flow warnings have separate collections; do not infer warning type by searching message text. Preserve the existing dashboard transfer exclusion, including its current fee treatment; changing report transfer inclusion or fee policy is not part of this change.

### Decision 4: Finish P1 as focused services, not more code in the monolith

**Choice:** Extract `BudgetsService`, `RecurringRulesService`, and `ReportsService` into `budgets.ts`, `recurring-rules.ts`, and `reports.ts`. Keep P1 controllers, provider arrays, category behavior, and compatibility re-exports in `p1.module.ts`. Move `validatedMonthBounds` to `planning-time.ts` and re-export it from `p1.module.ts` for current tests. Use generated Prisma model/payload types and inferred transaction-client callbacks; accept `unknown` at request boundaries and narrow before querying.

Budget creation still takes its currency from user preferences, as `UpsertBudgetRequest` currently defines no currency selector. An existing budget retains its own stored unit on limit updates even if preferences changed. Format limit/spent/remaining with that unit's precision. Accumulate native expenses and matching snapshots exactly; preserve month/timezone, ownership, void, and category filters.

Recurring rules retain the account-matching currency constraint, existing cadence behavior, serializable catch-up transaction, 500-occurrence bound, and `(ruleId, occurrenceAt)` uniqueness. Create/list/update DTOs and generated ledger postings use exact amounts. Do not change recurrence scheduling as part of precision work.

Reports retain filters and half-open time ranges, normalize each native total with its own code, and format complete base totals with base precision. Keep `baseTotal` absent when partial. Remove P1's `currencyDefaults`, local `code`, `add`, `multiply`, and `fixed` implementations once callers use the shared adapter.

**Alternatives considered:** Fixing only budget formatting; keeping P1's 635-line module; a new generic finance service or repository layer.

**Rationale:** Precision affects writes, reads, and aggregation, not just labels. Feature extractions match the existing `accounts.ts` pattern and keep handwritten modules normally below 500 lines and always below 800. Do not move `any` into new files: type the extracted services and remaining controller/category boundaries while preserving their behavior.

### Decision 5: Build the mobile journey with existing navigation and controls

**Choice:** Retain `RootNavigator`, session context, basic React Native components, and the existing API client. Add a small shared monetary-unit selector, account form, and transaction form. Keep independent base/account unit state during onboarding. After confirmed onboarding success, call an `onComplete` prop so the navigator enters the dashboard; never infer success from submission start or an error.

Account creation uses `/accounts`; transaction entry uses `/accounts/:id/transactions`, taking the native code from the selected account. Store input as text throughout. Keep a request key stable for retrying an unchanged pending command; disable duplicate submission and rotate the key for a genuinely new command. Refresh server-confirmed dashboard/account data after success, without optimistic monetary arithmetic. Distinguish a failed write from a successful write whose refresh failed so retry does not create a new operation.

Use a pure mobile `formatMonetaryAmount` helper backed by domain `Money`/metadata to pad and label exact amounts, including values beyond numeric integer accuracy. Do not use `Intl.NumberFormat` currency mode for the four-character code or convert money through `Number`. Show six-decimal native USDT account/activity values, target-labeled base summaries, explicit partial labels, individual pair warnings, and report native totals. A refreshed response replaces prior partial/warning state rather than appending to it.

**Alternatives considered:** A selector-only patch; a new navigation/form/state dependency; a hardcoded USDT option; formatting every value as USD; client-side FX calculations.

**Rationale:** Current mobile has no completed account/transaction-entry path, and onboarding completion otherwise remains on the setup screen. Small focused components close the required journey without redesigning the app or adopting Expo Router. Native and converted values must coexist; the API remains authoritative for conversion and confirmed balances.

### Decision 6: Keep shared contracts authoritative and validate consumed responses

**Choice:** Reuse `AccountDto`, `CreateAccountRequest`, `RecordTransactionRequest`, `TransactionDto`, `OnboardingRequest`, `OnboardingResponse`, `AuthResponseDto`, `DashboardDto`, and `FinancialReportDto`. Add `partial` and `warnings` to `DashboardDto.flow` to match the dirty API's intended output. Give `ApiClient.report` its real report return type, and add focused decoders for the responses consumed by this journey. Treat fetched JSON/errors as `unknown` before narrowing; generic type arguments alone do not validate network data.

**Alternatives considered:** Screen-local copies; broad response casts; keeping `useState<any>`; a new validation dependency.

**Rationale:** The API and mobile currently drift at exactly the partial-total boundary. Small contract-backed decoders preserve zero-`any` behavior without a new framework. For compatibility with an older API lacking flow completeness fields, normalize the missing fields to an explicitly unavailable/incomplete flow, never an asserted complete result; an omitted report base total must remain omitted.

## Data Flow

```text
Domain catalog + Money/FxRate/decimal primitives
        |                         |
Mobile selector/text input       API monetary adapter
        |                         ^
        +-- existing JSON API --> unknown request validation
                                  |
                         ownership + source money + FX selection
                                  |
                         Prisma financial transaction
                          /          |           \
                    operation     ledger      immutable snapshot
                          \          |           /
                            read-side aggregation
                                  |
                         canonical string DTOs
                                  |
                     mobile decode -> native/base/partial views
```

### Cross-unit posting sequence

```text
Client -> Service: exact string, source/target account, time, optional rate/key
Service -> Idempotency: replay existing successful response, or proceed
Service -> Validation/Prisma: validate units, ownership, archive/category rules
Service -> FX lookup: direct historical pair at or before operation time
FX lookup -> Service: selected evidence OR missing (422; no financial writes)
Service -> Domain: source Money -> FxRate.convert(..., HALF_UP) -> target Money
Service -> Prisma transaction: operation + signed postings + selected evidence
Prisma -> Service: commit all OR roll back all
Service -> Idempotency: save existing replay response
Service -> Client: exact native/target values; client refreshes confirmed views
```

The existing idempotency service saves responses after financial commit. This design preserves tested sequential successful replay and does not claim crash-safe or concurrent exactly-once execution. That pre-existing gap must be reported separately if failure-injection exposes it; do not broaden into a repository-wide idempotency redesign under USDT precision work. Failure before both transfer postings and evidence finish must still roll back the financial transaction.

Dashboard flow queries cover the full requested period; only `recentActivity` is limited to fifty. Budgets/reports use their stored snapshot policy and never query new rates to repair old evidence. Mobile re-fetch replaces complete data atomically; loading/error states cannot become successful financial activity.

## Interfaces / Contracts

The following signatures describe the intended boundaries, not a second implementation of domain models:

```ts
// API monetary adapter; domain owns identity and arithmetic.
type StoredDecimal = string | Prisma.Decimal;
type NativeAmountKind = 'positive' | 'non-negative';

declare function monetaryUnit(value: unknown): MonetaryUnitMetadata;
declare function decimalText(value: StoredDecimal): string;
declare function nativeAmount(
  value: unknown,
  code: SupportedMonetaryUnitCode,
  kind: NativeAmountKind,
): string;

interface SelectedFxEvidence {
  readonly baseCode: SupportedMonetaryUnitCode;
  readonly quoteCode: SupportedMonetaryUnitCode;
  readonly rate: string;
  readonly source: 'MARKET' | 'MANUAL';
  readonly effectiveAt: Date;
}

// Addition to the existing DashboardDto.flow, not a new wire envelope.
interface DashboardFlow {
  readonly income: string;
  readonly expense: string;
  readonly partial: boolean;
  readonly warnings: readonly string[];
}

// Pure mobile presentation; never calculates an exchange rate.
declare function formatMonetaryAmount(
  amount: string,
  code: SupportedMonetaryUnitCode,
): string;
```

`SelectedFxEvidence` is API-local persistence evidence; it does not replace domain `FxRate` or add a public endpoint. A shared `fx-evidence.ts` resolver returns this value or an explicit missing result; write callers translate missing into `MISSING_FX_RATE`, while dashboard callers produce partial warnings. Matching snapshot selection for budgets/reports remains separate. API serialization uses existing contract shapes; retain string amounts and current error codes. `record`/required-string guards move to a small `common/request-input.ts` module rather than being copied into each extracted service.

## File Changes

Paths below are an implementation plan. “Continue” means preserve and reconcile existing dirty work, not overwrite it. No product files are changed by this phase.

| File | Action | Description |
|---|---|---|
| `packages/domain/src/monetary-unit.ts` | Continue | Reconcile unknown-input hardening/frozen canonical metadata; preserve USDT-01 identities. |
| `packages/domain/src/index.ts` | Continue | Retain dirty metadata exports; expose only needed existing decimal primitives. |
| `packages/domain/test/monetary-unit.test.ts` | Continue | Preserve dirty tests and cover non-string/unsupported inputs. |
| `packages/domain/test/money.test.ts`, `packages/domain/test/fx-rate.test.ts` | Modify | Extend existing domain precision/direction regression cases as needed. |
| `packages/contracts/src/dashboard.ts` | Modify | Declare flow completeness fields matching the API. |
| `apps/api/src/common/request-input.ts` | Create | Narrow object/string boundary validation reused by touched controllers/services. |
| `apps/api/src/modules/p0-finance.ts` | Continue | Thin canonical money/Decimal adapter; remove duplicate arithmetic and unknown coercion. |
| `apps/api/src/modules/fx-evidence.ts` | Create | Shared directional historical selection and selected-evidence mapping. |
| `apps/api/src/modules/accounts.ts` | Continue | Validate accepted native amounts consistently and preserve posting/snapshot semantics. |
| `apps/api/src/modules/p0-monetary.ts` | Continue existing untracked file | Finish onboarding/transfers/dashboard precision, evidence, partial fields, and full-period flow. Split dashboard into `apps/api/src/modules/dashboard.ts` if growth reaches 500 lines. |
| `apps/api/src/modules/p0.module.ts` | Continue | Preserve provider/controller imports and compatibility exports; share request guards. |
| `apps/api/src/modules/p1.module.ts` | Modify | Extract monetary services; retain controllers/category behavior and compatibility exports without handwritten `any`. |
| `apps/api/src/modules/budgets.ts` | Create | Typed canonical-precision budget progress and writes. |
| `apps/api/src/modules/recurring-rules.ts` | Create | Typed recurring rules/occurrences preserving current scheduling and atomic catch-up. |
| `apps/api/src/modules/reports.ts` | Create | Typed historical reports with per-unit native totals and omitted incomplete base total. |
| `apps/api/src/modules/planning-time.ts` | Create | Existing month-boundary adapter shared by extracted services; no scheduling rewrite. |
| `apps/api/package.json` | Modify | Declare `@lukitas/contracts` workspace dependency if importing its DTO types. |
| `apps/api/test/accounts.spec.mjs` | Modify | Parameterize unit-aware fixtures; prove exact opening/transaction amounts and invalid-input no-write behavior. |
| `apps/api/test/route-matrix.spec.mjs`, `apps/api/test/p1-route-matrix.spec.mjs` | Modify | Test registered controllers/guards across extraction boundaries, not obsolete single-file counts. |
| `apps/api/test/usdt-monetary.spec.mjs` | Create | Runtime adapter, onboarding, transfer, snapshot, dashboard, and missing-rate tests. Split by feature before 500 lines. |
| `apps/api/test/usdt-planning.spec.mjs` | Create | Runtime budget/recurrence/report scenarios and failure cases. |
| `apps/api/test/fixtures/monetary-harness.mjs` | Create | Focused shared in-memory financial fixture with commit/rollback staging; no production abstraction. |
| `apps/mobile/package.json`, `pnpm-lock.yaml` | Modify | Add existing domain/contracts workspace dependencies; no external package or version upgrades. |
| `apps/mobile/src/api/client.ts` | Modify | Typed financial methods/error handling, consumed-response decoding, existing refresh/replay behavior retained. |
| `apps/mobile/src/api/financial-responses.ts` | Create | Unknown-to-contract validation for consumed financial responses, including partial/optional fields. |
| `apps/mobile/src/features/monetary.ts` | Create | Shared exact amount display and canonical active choices, no copied precision map. |
| `apps/mobile/src/features/monetary-unit-select.tsx` | Create | Reusable labeled selection control using existing native controls. |
| `apps/mobile/src/features/account-form.tsx`, `apps/mobile/src/features/transaction-form.tsx` | Create | Focused manual entry, pending/error states, successful refresh callbacks. |
| `apps/mobile/src/features/monetary-commands.ts` | Create | Small typed, testable account/onboarding/transaction submission functions used by the forms; do not duplicate API DTOs. |
| `apps/mobile/src/features/screens.tsx` | Modify | Typed auth/onboarding/dashboard state, independent selections, native accounts and flow warnings; compose forms instead of growing a monolith. |
| `apps/mobile/src/features/reports-screens.tsx` | Modify | Typed report, all native totals, pair warnings, and explicit unavailable base total. |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Modify | Typed auth/me response and confirmed onboarding completion transition. |
| `apps/mobile/test/p0-journey.spec.mjs` | Modify | Preserve source wiring checks and extend them to the new composed journey. |
| `apps/mobile/test/usdt-journey.spec.mjs` | Create | Execute pure formatter/decoder/command functions with mocked fetch and exact fixtures. |

No files are planned for deletion. Reuse `apps/api/test/month-bounds.spec.mjs`, existing domain tests, and committed schema tests unchanged where possible. `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/20260922190000_usdt_monetary_unit/migration.sql` are baseline regression inputs, not planned changes. The ODD tracker and CI file remain untouched by this phase.

## Testing Strategy

Strict TDD remains disabled in `openspec/config.yaml`. Financial behavior tests accompany each implementation slice; routing-boundary regression tests identified in the threat matrix are written failing before the corresponding new wiring behavior. A green source-inspection test is not proof of runtime behavior.

| Layer | What to test | Approach |
|---|---|---|
| Domain/adapter unit | Codes, active metadata, exact signed/zero values, HALF_UP, rates independent of money precision, large formatting, native precision/storage rejection | Existing `node:test` domain suite and API `tsx/esm` tests using real domain types and real Prisma Decimal values. Include a rate such as `0.0000001` to exercise plain-decimal serialization. |
| P0 services | Account/onboarding reload, income/expense signs, categorized cross-unit transactions, archived/ownership restrictions, immutable snapshots, transfers and missing rates | Extend the account harness; execute services with controlled time and stored rate fixtures. Model transaction staging/rollback rather than a fake that commits each call immediately. Assert all affected rows and balances, not only returned strings. |
| P1 services | Native/snapshot budget progress, missing evidence/IDs, recurring once-per-occurrence behavior, native and base report totals | Runtime tests against extracted services, including repeated catch-up and changed rate data after recording a snapshot. Preserve month/DST tests and query filters. |
| Wiring/security | Existing `/v1` routes, guard registration, provider registration, ownership after extraction, success-only navigation | Inspect actual exported controller/provider arrays and metadata where possible; execute ownership failures. Adapt old source checks only where still useful. |
| Mobile unit/integration | Selection, string-preserving command payloads, decoded partial states, formatting, error and successful-refresh behavior | `node:test` imports pure TS functions; mock fetch to drive success/failure/retry and verify confirmed state callbacks. Do not try to run TSX/native rendering through Node strip-types. |
| Local integration/manual journey | Persist/reload USDT account/transaction and immutable evidence; one-sided transfer rollback; visible controls, warnings and setup transition | Use a separately approved disposable local database/API and Expo web/native session. Record actual commands/environment and results; do not use ambient remote connections. Export smoke proves bundling, not user interaction or database rollback. |

### Mandatory scenario fixtures

1. Account `1.234567` USDT plus income `0.000002` minus expense `0.000001` reloads as `1.234568`; zero is `0.000000`. Reject non-string codes/amounts, unsupported `ABCD`, lowercase codes, and unrepresentable new native values without financial writes.
2. `1.234567 USDT * 1.005 = 1.24 USD`; `* 36.5 = 45.06 VES`; `1.00 USD * 1.2345675 = 1.234568 USDT`. Signed `+/-1 USDT * 1.005` yields `+/-1.01 USD`; zero remains zero. Wrong-direction domain conversion fails.
3. Exclude future/reverse-only rates; manual zero/negative rates fail. Preserve chosen source/time/rate and amounts after a later rate is inserted. No missing-rate failure leaves transactions, ledger entries, transfers, or snapshots.
4. Transfer `0.000001` between USDT accounts without FX; cross-unit transfer posts source/destination precision once under successful sequential replay. Inject failure after the first posting and during snapshot creation; assert rollback of all financial rows. Retain principal exclusion from dashboard flow.
5. USDT budget `1.000001` less expense `0.000002` returns `0.999999`; unmatched USD evidence sets partial with pair warning/affected ID. Include matching immutable snapshots and an over-budget negative remaining value.
6. A `0.000001` recurring expense due twice produces exactly two occurrences and balance `0.999998` from `1.000000`; repeated catch-up creates none. A USD rule for a USDT account fails without mutation.
7. USD-base balances `10.00 USD` and `2.123456 USDT` without rates yield known subtotal `10.00`, partial warning, and intact native values. Future-only rates cannot complete historical flows. More than fifty period transactions still contribute to flow totals.
8. Incomplete report retains `10.00 USD` and `-0.000001 USDT` native totals and omits `baseTotal`; complete USDT income `1.234567` minus expense `0.000001` yields `1.234566`. Empty base totals use base precision with no spurious warnings.
9. Mobile independently selects USD base/USDT account, and USDT base/USDT zero account. A manual expense leaves `1.234566`; failures show no success or speculative balance. Format `9007199254740993.123456`, `0.000001`, and `0.000000` USDT exactly, alongside `1.20 USD`.
10. Partial-to-complete refresh removes stale warnings; report without `baseTotal` renders unavailable, not zero. Unsupported/inactive choices cannot be submitted. A successful onboarding response advances navigation; rejection does not.

### Verification commands and evidence limits

Run the recorded domain/contracts/API typechecks and tests for USDT-02, then mobile typecheck/tests and `pnpm --dir apps/mobile smoke` for USDT-03. Final checks retain `pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma`, `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`, `pnpm test:all`, and `pnpm gate` from the ODD record. Validate/generate do not establish that a migration ran against a database.

Run mobile tests explicitly: the current `test:all` script omits them. Run package typechecks/tests explicitly: the current `gate` runs workspace/readiness checks, not these functional suites. Report a missing local database or unavailable device/browser as unexecuted integration evidence, never as a pass. No checks are claimed by this design artifact.

## Threat Matrix

The installed matrix was reviewed because controller registration and onboarding navigation are affected. No command execution or VCS automation is introduced. Required reference rows are retained below; application-specific routing rows follow them.

| Boundary | Minimum adversarial cases | Applicability | Design response / safe failure | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A: no file classification or execution | No product file-execution boundary changes. | None. |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A: no Git automation | No repository-selection behavior changes. | None. |
| Commit state | staged, `commit -a`, empty index | N/A: no commit automation | No staging/commit behavior; existing dirty files are preserved. | None. |
| Push state | tracking branch, first push, explicit refspec | N/A: remote delivery is excluded | No push behavior. | None. |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A: no PR automation | No PR command generation/execution. | None. |
| API controller wiring and ownership | Missing provider after extraction; unguarded moved controller; another user's account/category/rule | Applicable: feature extraction changes registration/import boundaries | Same paths/guards; no duplicate controllers; unauthorized or foreign-resource requests fail before writes. | `route-matrix.spec.mjs`, `p1-route-matrix.spec.mjs`: exported controller/provider and guard checks; `usdt-monetary.spec.mjs`/`usdt-planning.spec.mjs`: denied ownership creates no financial rows. |
| Onboarding navigation and financial submission | Rejected setup; duplicate submit; response failure; successful setup without token change | Applicable: success callback changes navigation state | Failure stays on the form with no success state; pending submission disabled; unchanged retries retain their key; only confirmed success advances. | `usdt-journey.spec.mjs`: command/callback success and rejection tests; `p0-journey.spec.mjs`: callback wiring regression; local UI journey verifies actual transition. |

Carry applicable rows, cases, and failure behavior unchanged into tasks. Do not invent shell/VCS tests for N/A rows.

## Migration / Rollout

**No new migration required.** Preserve the committed widening migration, active USDT seed, four-character schema, and existing rows. New work uses existing Decimal capacity; do not widen columns for the presentation-only large-number fixture.

1. Reconcile USDT-02 against the recorded dirty baseline, including the untracked module. First establish adapter/registration tests, then finish P0 behavior and P1 precision/evidence. Keep each behavior change with its tests. Do not mark USDT-01 incomplete or re-run its implementation.
2. Deliver USDT-03 only after API behavior and contract fields are verified. Publish-capable builds must pair the canonical catalog with a compatible API; static catalog activation does not imply an older server can process USDT correctly.
3. The runtime strategy is `auto-chain` with a 400-authored-line review policy. The existing extraction and remaining P1/mobile work make a single slice high risk. Tasks should separate adapter/P0, P1 feature extractions with tests, and mobile journey/presentation into coherent review units, subdividing further if needed. Do not treat the historical USDT-01 review exception or the ODD's older `ask-on-risk` value as permission to bypass the current policy. This is a local plan, not authorization to commit or create PRs.
4. Preserve public paths and existing DTO fields; the dashboard flow metadata is additive. Keep P0/P1 service exports needed by existing tests. Valid fiat behavior remains covered. New validation rejects previously coerced, unsupported, over-precision, or overflowing inputs intentionally; no blanket historical data cleanup is included.
5. On failure, stop the affected slice and revert only its inspected additions/edits relative to the captured baseline. Never blanket-reset, delete the pre-existing untracked module, discard tracker/CI changes, or narrow the schema. Once USDT records exist, rolling the API back to a version that cannot read them is unsafe even though the widening migration remains. Prefer disabling new UI entry while retaining compatible readers, or a forward fix; verify six-decimal reads before any later operational rollback. Deployment and rollback execution require separate authorization.

### Technology evidence and context limits

Manifest/lockfile versions inspected: Node `24.20.0`, pnpm `11.24.0`, TypeScript `7.0.2`, NestJS `12.0.1`, Prisma/client/adapter `7.10.0`, Expo `57.0.20`, React `19.2.3`, React Native `0.86.3`. API uses strict NodeNext TypeScript and decorators; mobile extends Expo's base configuration. No upgrades or new external dependencies are proposed.

- Prisma v7 [special fields](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types) and [transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions) document Decimal.js-backed fields and interactive transaction rollback. Context7 returned mixed-version material, so the explicit v7 pages were consulted. Installed client `7.10.0` declarations confirm the plain-string `toFixed()` boundary; exact runtime arithmetic/serialization still receives focused tests.
- React Native [0.86 TextInput](https://reactnative.dev/docs/0.86/textinput) documents string `value`/`onChangeText` and decimal keyboard hints. Installed `0.86.3` `TextInput.d.ts` confirms those signatures. Preserve strings; a numeric keyboard is not validation.
- The public NestJS modules page returned insufficient rendered content. Installed `12.0.1` controller/injectable declarations confirm route prefixes and provider visibility. Keep existing registration conventions and verify runtime metadata; do not infer a new module pattern from unavailable patch-specific documentation.
- Expo/React APIs are not upgraded or replaced; retain existing hooks, controls, client, and export-smoke script. Implementation must check installed declarations/documentation before introducing APIs beyond those already used.
- DBeaver and NotebookLM remote/session discovery were not performed: this task authorizes local continuation and no remote operations. Repository schema, supplied artifacts, and current code are the evidence; prior claims about remote data were not revalidated. Public documentation reads do not involve project credentials or upload project content.

## Open Questions

No unresolved product decision blocks task planning. The following are explicit implementation/verification risks, not permission to expand scope:

- Exact-version installed APIs must be rechecked if implementation deviates from the documented adapters; no new library is pre-approved.
- Local database/device availability determines which integration evidence can actually be produced. Confirm the disposable local test target before database writes; report unavailable coverage honestly.
- Existing post-commit idempotency-response persistence has a crash/concurrency gap. Preserve successful sequential replay and financial rollback guarantees; escalate a reproducible acceptance failure rather than claiming stronger semantics or silently rewriting infrastructure.
- New native-input precision rejection tightens formerly permissive behavior. Test valid fiat compatibility, redundant trailing zeros, and unchanged historical reads explicitly; never mutate legacy rows to make them fit.
