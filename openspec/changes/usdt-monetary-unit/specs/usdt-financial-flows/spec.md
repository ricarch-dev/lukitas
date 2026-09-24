# USDT Financial Flows Specification

## Purpose

Extend existing financial journeys to exact six-decimal USDT accounting while preserving supported fiat behavior, directional FX, historical evidence, and explainable incomplete totals. This specifies USDT-02 acceptance behavior; its current partial implementation is unverified. Supported identities and metadata are defined by `monetary-unit-support`.

## Requirements

### Requirement: Supported monetary input boundaries

Financial operations accepting a monetary-unit code MUST validate that it is a supported active string code without coercing non-string input. Monetary amounts and rates crossing the API boundary MUST use exact decimal strings, not binary floating-point numbers. Invalid monetary input MUST produce a validation failure without recording the requested financial operation or changing balances.

#### Scenario: Valid USDT input is accepted

- GIVEN an authenticated user and a valid account request with code `USDT` and opening balance `1.234567`
- WHEN the request is submitted
- THEN the account is accepted with USDT precision six and the exact supplied opening balance.

#### Scenario: Invalid external monetary input causes no financial mutation

- GIVEN an otherwise valid request
- WHEN its unit code is a number, null, an array, an object, `usdt`, or unsupported `ABCD`, or its amount is numeric `1.25` instead of a decimal string
- THEN the request fails validation
- AND no account, transaction, transfer, budget, or recurring rule requested by that operation is recorded and no balance changes.

### Requirement: Exact native account and transaction accounting

Account creation, onboarding, transaction recording, and account reads MUST preserve accepted USDT amounts through six fractional digits using exact decimal accounting. Income MUST increase and expense MUST decrease the account balance. Native USDT money returned by these flows MUST show six decimal places, including zero. Same-unit operations MUST NOT require an FX rate. Existing restrictions on archived accounts and uncategorized cross-unit transactions MUST remain in force.

#### Scenario: Small native transactions remain visible after reload

- GIVEN a USDT account with opening balance `1.234567` and no FX rates
- WHEN income `0.000002` and expense `0.000001` are recorded and the account is reloaded
- THEN its balance is `1.234568` USDT
- AND both transaction amounts retain their six-decimal values without a two-decimal intermediate rounding.

#### Scenario: Zero opening balance uses account precision

- GIVEN onboarding selects USDT as both the base unit and first account unit with opening balance `0`
- WHEN onboarding completes and the account is read
- THEN both selected units remain USDT and the account balance is `0.000000`
- AND no FX rate is required.

#### Scenario: Existing account restrictions still apply

- GIVEN either an archived USDT account or an active USDT account receiving an uncategorized USD transaction
- WHEN a new transaction is attempted
- THEN it is rejected under the applicable account or currency-mismatch restriction
- AND no transaction, ledger posting, or balance change is recorded.

### Requirement: Directional FX and target-unit rounding

Every rate MUST mean `1 BASE = rate QUOTE`; conversion MUST multiply the source amount by a positive exact rate in that direction. Conversion MUST retain exact intermediate decimal values and round only the resulting money to the target unit's canonical precision using HALF_UP, with ties away from zero. Rate precision MUST NOT be reduced to the source or target money precision. A reverse-direction rate MUST NOT be used as though it were a forward-direction rate, and USDT MUST NOT imply USD parity.

#### Scenario: USDT converts to fiat precision

- GIVEN an eligible conversion with source amount `1.234567` USDT
- WHEN the rate is `1 USDT = 1.005 USD`, or independently `1 USDT = 36.5 VES`
- THEN the respective target amount is `1.24` USD or `45.06` VES
- AND the original USDT amount and the exact selected rate are preserved.

#### Scenario: Fiat converts to six-decimal USDT precision

- GIVEN an eligible USD-to-USDT conversion of `1.00` USD at `1 USD = 1.2345675 USDT`
- WHEN the amount is converted
- THEN the target amount is `1.234568` USDT
- AND the rate remains `1.2345675` rather than being rounded before multiplication.

#### Scenario: Signed and zero conversions retain their meaning

- GIVEN conversion calculations at `1 USDT = 1.005 USD`
- WHEN the source values are `1.000000`, `-1.000000`, and `0.000000` USDT
- THEN the corresponding USD values are `1.01`, `-1.01`, and `0.00`.

#### Scenario: A directional rate rejects the wrong source unit

- GIVEN a rate whose direction is `1 USD = 2 USDT`
- WHEN that rate is directly applied to source money of `1.000000` USDT without an explicit inversion
- THEN conversion fails for direction mismatch rather than returning `2.00` USD.

### Requirement: Historical FX evidence and missing-rate failures

Rate-dependent writes MUST use a valid supplied manual rate or an applicable directional historical rate effective no later than the operation time. Without either, the write MUST fail with `MISSING_FX_RATE` without partial financial postings. A successful converted transaction or transfer MUST retain its selected rate, direction, source, effective time, and recorded monetary result as immutable historical evidence. Later rate changes MUST NOT reprice that operation. Invalid zero or negative rates MUST fail validation.

#### Scenario: Historical selection excludes future rates

- GIVEN a categorized USDT expense of `1.000000` into a USD account at time T
- AND a USDT-to-USD rate of `1.01` effective before T and `1.05` effective after T
- WHEN the expense is recorded without a manual rate
- THEN the USD account is debited `1.01`
- AND its evidence records the historical rate selected for T, not `1.05`.

#### Scenario: Manual snapshots are not repriced

- GIVEN a categorized expense of `1.000000` USDT recorded into a USD account at a manual rate of `1.02`
- WHEN a later market rate becomes `1.10` and the operation is read or included in historical budget/report calculations
- THEN its stored source amount, `1.02` USD result, rate `1.02`, manual source, direction, and effective time remain unchanged.

#### Scenario: Missing directional rate prevents a converted write

- GIVEN a cross-unit transaction or transfer from USDT to USD with no manual rate and no applicable historical USDT-to-USD rate
- AND any available direct rate is future-dated or belongs to an unrelated pair
- WHEN the operation is submitted
- THEN it fails with `MISSING_FX_RATE`
- AND no transaction, transfer, snapshot, or ledger posting for that operation is created and balances do not change.

#### Scenario: Non-positive manual rates are invalid

- GIVEN an otherwise valid cross-unit operation
- WHEN its manual rate is `0` or `-1`
- THEN validation fails rather than recording a zero or negative conversion.

### Requirement: Precision-preserving atomic transfers

Transfers involving USDT MUST preserve source-unit and destination-unit amounts at their respective precisions, apply directional conversion when the units differ, and retain conversion evidence. Both transfer postings MUST succeed together or neither MUST be applied. Same-unit transfers MUST preserve the same amount without requiring FX. Existing idempotent retries MUST NOT create duplicate postings. Internal transfer principal MUST NOT be counted as dashboard income or expense.

#### Scenario: Cross-unit transfer posts the correct two amounts once

- GIVEN active USDT and VES accounts and a manual rate of `1 USDT = 36.5 VES`
- WHEN `1.234567` USDT is transferred without a fee and the identical request is retried with its original idempotency key
- THEN exactly one transfer debits `1.234567` USDT and credits `45.06` VES
- AND conversion evidence is retained without duplicate postings or dashboard income/expense from the principal.

#### Scenario: A later rate does not reprice a recorded transfer

- GIVEN a completed transfer debiting `1.234567` USDT and crediting `45.06` VES at rate `36.5`
- WHEN a later USDT-to-VES rate of `40` becomes available and the recorded transfer is read
- THEN its amounts remain `1.234567` USDT and `45.06` VES
- AND its snapshot retains rate `36.5`, the original direction, source, and effective time.

#### Scenario: Same-unit transfer does not require a rate

- GIVEN two active USDT accounts and no FX rates
- WHEN `0.000001` USDT is transferred without a fee
- THEN the source debit and destination credit are both exactly `0.000001` USDT.

#### Scenario: A failed transfer cannot leave a one-sided balance change

- GIVEN an otherwise valid transfer involving USDT
- WHEN the operation fails before both postings can be recorded successfully
- THEN neither account balance changes and no partial transfer posting remains.

### Requirement: Precision-aware budget progress

Budgets whose currency is USDT MUST return their limit, spent amount, and remaining amount at six decimals. Eligible same-unit expenses and matching historical transaction snapshots MUST contribute exact amounts; expenses lacking matching conversion evidence MUST be excluded from calculated progress and identified through `partial`, warnings, and affected transaction IDs. Missing evidence MUST NOT be represented as a zero-valued conversion or a complete progress result.

#### Scenario: USDT budget progress retains sub-cent amounts

- GIVEN a USDT budget limit of `1.000001` for a category and month
- AND its only eligible expense is `0.000002` USDT
- WHEN progress is requested
- THEN limit is `1.000001`, spent is `0.000002`, remaining is `0.999999`, and partial is false.

#### Scenario: Missing budget evidence produces explainable partial progress

- GIVEN the same budget and native expense plus a USD expense without a matching USDT snapshot
- WHEN progress is requested
- THEN spent remains `0.000002` and remaining remains `0.999999` as partial calculations
- AND partial is true, a warning identifies USD/USDT, and affected IDs include the USD expense.

### Requirement: Exact USDT recurring occurrences

Recurring rules for USDT accounts MUST accept the matching USDT code, retain the exact six-decimal amount in create/list responses and generated transactions, and post the correct signed ledger amount. Catch-up MUST retain existing once-per-occurrence behavior. A rule specifying a different unit from its account MUST fail without creating a rule or posting.

#### Scenario: Catch-up preserves precision without duplicate occurrences

- GIVEN a USDT expense rule of `0.000001` with two due occurrences on an account whose opening balance is `1.000000`
- WHEN catch-up runs through both occurrences and is repeated through the same time
- THEN exactly two expense transactions of `0.000001` USDT exist
- AND the account balance is `0.999998` and rule listing still reports `0.000001` USDT.

#### Scenario: Recurring currency mismatch is rejected

- GIVEN an active USDT account
- WHEN a recurring rule explicitly specifies USD
- THEN the request fails with a currency-mismatch error without creating a rule or ledger posting.

### Requirement: Explainable dashboard and report totals

Dashboard and report money MUST use the precision of the represented unit, preserve native amounts, and distinguish unavailable conversions from genuine zero values. Dashboard balances MUST return the known converted subtotal with `partial: true` and missing-pair warnings when necessary. Historical dashboard flows MUST use matching transaction snapshots or applicable historical rates, never future rates. Reports MUST retain native totals, warnings, and affected IDs while omitting `baseTotal` when conversion evidence is incomplete; they MUST NOT replace missing conversion evidence with current prices. Complete totals MUST be identified as complete.

#### Scenario: Dashboard missing rates retain native balances and known subtotal

- GIVEN a USD-base dashboard with balances of `10.00` USD and `2.123456` USDT and no applicable USDT-to-USD rate
- WHEN balances are loaded
- THEN the total is `10.00` USD with partial true and a USDT/USD warning
- AND the USDT account still shows `2.123456`, not zero or an assumed parity conversion.

#### Scenario: Historical flow remains partial despite a future rate

- GIVEN a USD-base dashboard period containing only USDT income `0.123456` without a matching USD snapshot or applicable historical rate
- AND a USDT-to-USD rate exists only after the transaction time
- WHEN the historical flow is requested
- THEN the known income subtotal is `0.00` USD with partial true and a historical USDT/USD warning
- AND the native activity remains `0.123456` USDT and is not described as zero-valued income.

#### Scenario: Incomplete report omits a misleading base total

- GIVEN a USD-base report period containing income `10.00` USD and expense `0.000001` USDT without a matching USD snapshot
- WHEN the report is requested
- THEN native totals are `10.00` USD and `-0.000001` USDT
- AND baseTotal is absent, partial is true, and warnings and affected IDs identify the missing USDT conversion.

#### Scenario: Complete and empty native totals use canonical precision

- GIVEN a USDT-base period with only income `1.234567` and expense `0.000001` USDT and no opening balances
- WHEN its dashboard and report are requested
- THEN dashboard income is `1.234567`, expense is `0.000001`, balance total is `1.234566`, and report base total is `1.234566`, all in USDT and complete
- AND for a separate empty USDT-base period and empty account set, dashboard totals are `0.000000` with partial false rather than missing-rate warnings.

## Existing Evidence Paths

Current relevant paths are `apps/api/src/modules/accounts.ts`, `apps/api/src/modules/p0-finance.ts`, `apps/api/src/modules/p0-monetary.ts`, `apps/api/src/modules/p1.module.ts`, `packages/contracts/src/budgets.ts`, and `packages/contracts/src/reports.ts`. P1 is included because the proposal explicitly covers budgets, recurrences, and reports; these scenarios are acceptance criteria, not claims that current code passes them.
