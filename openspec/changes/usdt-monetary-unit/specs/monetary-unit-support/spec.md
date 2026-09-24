# Monetary Unit Support Specification

## Purpose

Define the shared monetary-unit foundation for manually tracked, network-agnostic USDT balances. This is a new capability specification recording the USDT-01 baseline already committed and reviewed at `5fc5de4`, not a request to repeat that implementation or rewrite its migration. USDT-02 boundary hardening is specified separately in `usdt-financial-flows`.

## Requirements

### Requirement: Monetary-unit code identity

The system MUST preserve uppercase three- or four-letter monetary-unit identities and MUST distinguish a structurally valid code from a supported product unit. USDT MUST remain distinct from USD. Lowercase, mixed-case, malformed, and incorrectly sized codes MUST NOT be accepted as valid monetary-unit codes.

#### Scenario: Supported fiat and USDT identities remain distinct

- GIVEN the supported codes USD, EUR, VES, GBP, and USDT
- WHEN their identities are validated and returned to a consumer
- THEN each code is returned unchanged
- AND USDT is neither truncated to USD nor treated as an alias of USD.

#### Scenario: Invalid code syntax is rejected

- GIVEN each of `usdt`, `UsDt`, `US`, `USDTT`, `USD1`, and ` USDT `
- WHEN it is validated as a monetary-unit code
- THEN validation fails without normalizing it into a supported code.

#### Scenario: Valid syntax does not activate an unsupported unit

- GIVEN `ABCD` has valid code syntax but is absent from the supported-unit catalog
- WHEN a consumer asks for supported-unit metadata for `ABCD`
- THEN the lookup fails rather than inventing metadata or a default precision.

### Requirement: Canonical active monetary metadata

The system MUST expose consistent supported-unit metadata: USD, EUR, VES, and GBP are active with precision two; USDT is active with precision six. Every consumer of supported-unit metadata MUST agree on code, precision, and active status. Six-decimal USDT precision denotes application accounting and display precision, not blockchain atomic precision.

#### Scenario: USDT metadata carries six-decimal precision

- GIVEN a consumer requests supported USDT metadata
- WHEN the metadata is returned
- THEN the code is `USDT`, precision is `6`, and active status is true.

#### Scenario: Existing fiat metadata is preserved

- GIVEN a consumer requests metadata for each of USD, EUR, VES, and GBP
- WHEN the metadata is returned
- THEN each remains active with precision `2`.

### Requirement: Lossless monetary contract and persistence compatibility

Shared monetary representations and persisted monetary references MUST carry `USDT` without truncation, substitution, or loss of six-decimal amounts. Existing three-character fiat references, relationships, and amounts MUST remain readable and unchanged. Persisted USDT references MUST remain readable after reload. Establishing the active USDT catalog entry again MUST NOT create duplicate entries or change its precision.

#### Scenario: USDT monetary records survive round-trip storage

- GIVEN valid records carrying USDT references for accounts, preferences, transactions, FX rates and snapshots, transfers, budgets, and recurring rules
- AND their USDT monetary amount fields contain `1.234567`
- WHEN the records are persisted and read back through their corresponding representations
- THEN every USDT reference remains `USDT`
- AND every USDT monetary amount retains the exact value `1.234567`.

#### Scenario: Fiat records and catalog initialization remain compatible

- GIVEN existing fiat monetary records and an active USDT catalog entry with precision six
- WHEN the supported catalog is initialized again and the existing records are read
- THEN there is exactly one USDT catalog entry with precision six and active status true
- AND the fiat records retain their original codes, amounts, and relationships.

### Requirement: Manual network-agnostic USDT semantics

The system MUST treat USDT as one manually tracked monetary unit. Recording or reading a USDT balance MUST NOT require a network, token contract, wallet address, transaction hash, custody connection, or blockchain synchronization. The feature MUST NOT imply custody or obtain live cryptocurrency prices, and MUST NOT infer USD parity solely from the USDT code.

#### Scenario: A manual balance needs no blockchain identity

- GIVEN a user provides a name, the USDT code, and a valid opening balance
- WHEN the manual balance is created and read
- THEN no blockchain identity or custody connection is required
- AND the balance is identified by the monetary unit USDT, not a network-specific token variant.

#### Scenario: USD parity is not implicit metadata

- GIVEN USDT and USD are supported and no applicable conversion rate exists
- WHEN a consumer requests a USDT-to-USD converted value
- THEN supported-unit metadata alone does not supply a rate of one
- AND the financial flow's missing-rate behavior applies.

## Baseline Evidence

Existing evidence paths: `packages/domain/src/monetary-unit.ts`, `packages/domain/test/monetary-unit.test.ts`, `packages/contracts/src/money.ts`, and `apps/api/prisma/migrations/20260922190000_usdt_monetary_unit/migration.sql`. These references identify the delivered foundation; this specification does not certify the dirty USDT-02 changes.
