# USDT Mobile Journey Specification

## Purpose

Allow a user to select, record, and understand a manual USDT balance through onboarding, accounts, transactions, and consolidated views. This specifies the pending USDT-03 journey, depending on `monetary-unit-support` and `usdt-financial-flows`; it does not assert mobile implementation or verification is complete.

## Requirements

### Requirement: Supported active unit selection

Onboarding and account creation MUST offer supported active monetary units, including USDT, using the same identities and precision metadata as the financial system. A user's USDT selection MUST survive submission and reload without being replaced by a USD default. Unsupported or inactive units MUST NOT be offered as selectable choices.

#### Scenario: Onboarding selects a USDT first account

- GIVEN an authenticated user who has not completed onboarding
- WHEN the user selects USD as their base unit, USDT as their first account unit, and opening balance `1.234567`, then completes onboarding
- THEN the created account retains USDT and the exact opening balance after reload
- AND the reporting base remains USD rather than forcing both selections to the same unit.

#### Scenario: USDT can be the reporting base

- GIVEN an authenticated user completing onboarding
- WHEN the user selects USDT as the base unit and first account unit with opening balance `0`
- THEN onboarding succeeds and reload shows a USDT base and balance `0.000000` USDT.

#### Scenario: Account creation uses the active catalog

- GIVEN a user who has already completed onboarding
- WHEN account creation presents supported active units and the user selects USDT
- THEN USDT is selectable alongside active USD, EUR, VES, and GBP and remains selected on submission
- AND any unsupported or inactive unit in the available metadata is not selectable.

### Requirement: Exact manual account and transaction entry

Mobile entry MUST retain and submit exact decimal amounts through six USDT fractional digits without two-decimal rounding or conversion through binary floating-point money. A user MUST be able to create a USDT account and record an income or expense in it without network selection, wallet connection, custody claims, or live price lookup. Validation or submission failures MUST NOT be displayed as successfully recorded financial activity.

#### Scenario: Manual USDT journey preserves a small expense

- GIVEN a user creates a manual USDT account with opening balance `1.234567`
- WHEN the user records expense `0.000001` USDT and reloads the account and activity views
- THEN the expense is shown as `0.000001` USDT and the account balance as `1.234566` USDT
- AND no blockchain network, address, contract, transaction hash, wallet connection, or live-price step is required.

#### Scenario: Failed transaction does not appear successful

- GIVEN a user enters a transaction in a USDT account
- WHEN validation or API submission fails
- THEN the mobile journey presents a failure rather than a success confirmation
- AND it does not show the attempted transaction as recorded or apply its amount to the displayed confirmed balance.

### Requirement: Precision-aware native and converted presentation

Mobile account, activity, and summary views in the USDT journey MUST show native USDT money with six decimal places and an unambiguous USDT unit label. Converted values MUST be labeled with their target unit and displayed at that unit's precision without replacing or relabeling the native amount. Supported fiat presentation MUST retain its canonical precision. Monetary display MUST preserve exact decimal values, including values beyond binary floating-point integer accuracy.

#### Scenario: Native and converted values remain distinguishable

- GIVEN a USDT account with balance `1.234567` and an API-provided complete USD valuation of `1.24`
- WHEN the account and consolidated balance are displayed
- THEN the native value is identifiable as `1.234567` USDT and the converted value as `1.24` USD
- AND neither value is mislabeled as the other unit.

#### Scenario: Zero, sub-cent, and large values remain exact

- GIVEN native USDT values `0.000000`, `0.000001`, and `9007199254740993.123456` from the financial system
- WHEN each value is displayed in the journey
- THEN every significant digit is preserved with six fractional digits and a USDT label
- AND a fiat value `1.20` USD remains displayed at two fractional digits; grouping separators MAY vary without changing the value.

### Requirement: Visible partial and missing-rate states

Mobile consolidated views MUST distinguish complete totals from partial or unavailable conversions and MUST preserve visible native USDT balances or totals. A missing USDT conversion MUST NOT be displayed as zero value, assumed USD parity, or a complete consolidated balance. Dashboard known subtotals and report omitted base totals MUST retain their distinct API semantics, with visible warnings identifying the unavailable monetary pair.

#### Scenario: Dashboard shows a partial known subtotal

- GIVEN the dashboard returns native balances `10.00` USD and `2.123456` USDT, a known USD subtotal of `10.00`, partial true, and a USDT/USD warning
- WHEN the dashboard is displayed
- THEN the subtotal is visibly labeled incomplete, the missing USDT/USD conversion is explained, and `2.123456` USDT remains visible
- AND the user is not shown a complete total of `10.00` or an assumed total of `12.12` USD.

#### Scenario: Incomplete report does not invent a base total

- GIVEN a report returns native USDT total `-0.000001`, partial true, a USDT/USD warning, and no baseTotal
- WHEN the report is displayed
- THEN the native total and missing-conversion warning remain visible
- AND the consolidated base total is shown as unavailable rather than rendered as zero or a complete amount.

#### Scenario: Complete refreshed data removes the partial indication

- GIVEN a dashboard previously showed a missing USDT/USD warning
- WHEN a successful refresh returns a complete converted total with partial false and no warnings
- THEN the new total is shown as complete and the previous missing-rate warning is no longer displayed
- AND the native USDT balance remains visible with six decimals.

## Existing Evidence Paths

Existing mobile paths are `apps/mobile/src/features/screens.tsx`, `apps/mobile/src/features/reports-screens.tsx`, `apps/mobile/src/api/client.ts`, and `apps/mobile/test/p0-journey.spec.mjs`. These identify current journey surfaces and coverage locations, not newly invented routes or a claim of implemented USDT support.
