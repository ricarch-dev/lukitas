# Debts and loans

The first version tracks personal payables and receivables separately from available account money.
The active database is SQLite; PostgreSQL migration history is unchanged.

## Recording an obligation

- Choose payable (money you owe) or receivable (money owed to you).
- Record the counterparty, concept, outstanding principal, currency, date, and optional calendar due date.
- Existing obligations do **not** change an account balance.
- For new borrowing/lending, select an account and the amount moving now. The converted amount must equal the principal.
- The account determines cash currency. An explicit exchange rate is required when it differs from the debt currency:
  **1 account-currency unit = rate debt-currency units**.

## Payments

Each partial payment records its date, account, cash amount/currency, captured rate and exact reduction of principal.
For example, paying `2000.00 VES` at `0.025 USD/VES` reduces a USD debt by `50.00 USD`.
Conversion uses the existing exact Money/FxRate rules and rounds once, HALF_UP, to debt-currency precision.
Zero-rounded reductions and overpayments are rejected. A payment cannot precede the obligation.
An obligation is settled at zero; otherwise it is overdue only after its due date in the user's timezone.

Principal movements affect account balances through signed ledger entries but do not inflate ordinary income,
expenses, movement search, or financial report totals. Their history is available in the debts section.
Ordinary transaction reversal cannot independently void a principal event.

## API

All endpoints require the existing authentication guard and scope records/accounts to the authenticated user.

- `GET /v1/debts`: obligations with events, status, outstanding balances and per-currency payable/receivable totals.
- `GET /v1/debts/:id`: one obligation and event history.
- `POST /v1/debts`: `CreateDebtRequest`.
- `POST /v1/debts/:id/payments`: `RecordDebtPaymentRequest`.

POST accepts `Idempotency-Key`. The stored command includes the operation and debt target. Replay returns
the original response; changing the command with the same key is a conflict. Event, account posting,
version claim and replay record commit together. Concurrent overpayments cannot both commit.
The write claim precedes aggregate reads. Rolled-back SQLite lock conflicts receive at most two bounded
retries; exhausted contention returns a recoverable `CONFLICT`. Retrying the same key after a competing
commit returns its original response, including a final settlement, without another cash posting.

The additive migration is deployed by the normal API start command. Development tests apply it only to disposable
SQLite databases; implementation does not migrate the user's database.

Automatic installments, calculated interest, reminders, editing and reversing debt events are not included.
Previously paid portions of an old debt are not reconstructed: enter only its current outstanding principal.

## Mobile flow

Open **Deudas y préstamos** from Inicio to switch between **Por pagar** and **Por cobrar**.
Use **Registrar deuda o préstamo** or the Inicio `+` action to create an obligation.
Open a record for its principal, remaining amount, status and history, then choose **Registrar pago**
or **Registrar cobro**. Select the cash account and enter the agreed rate if currencies differ.
The form previews the exact debt-currency reduction before confirmation.

Dates use `YYYY-MM-DD`; recorded events use local noon on that date. A due date stays a calendar date.
Forms retain input and the same idempotency key after an uncertain network result, and prevent editing
that uncertain attempt until it is confirmed. The API rechecks the latest principal before committing.
Navigation keeps the existing four native/web tabs. Financial content uses opaque canonical surfaces;
no glass or blur dependency is added.

## Technology evidence

- Prisma 7.10.0: [libSQL adapter](https://github.com/prisma/prisma/tree/7.10.0/packages/adapter-libsql)
  and installed generated transaction/input types.
- NestJS 12.0.1: installed decorators/guard types and [official controller guide](https://docs.nestjs.com/controllers).
- No dependency added; exact arithmetic reuses `@lukitas/domain`.

## Checks

`node --test --experimental-strip-types packages/domain/test/debts.spec.ts`

`pnpm --dir apps/api exec node --test --experimental-strip-types test/debts.spec.mjs`

The API regression applies real migrations and checks cash effects, history, cross-currency rounding,
owner isolation, idempotency, overpayment rejection, concurrency and ordinary reporting preservation.
