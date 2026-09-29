# Safe API response telemetry

## Objective
Show one development-only completion line for every HTTP response with method, safe route template, final status, and elapsed duration.

## Problem and why
The API currently prints startup addresses and Nest errors but no per-response activity. Logging URLs, bodies, headers, or response payloads would expose identifiers, credentials, tokens, and financial data.

## Scope and constraints
- Add a response-finish observer before route registration in the API bootstrap and regression coverage in the isolated smoke harness. Preserve the production `logger: false` setting and existing startup/health assertions.
- Never log request/response bodies, queries, headers, tokens, passwords, IDs, financial data, or literal request path segments. Use only a recognized framework route template or `<unmatched>`.
- No dependency additions, `any`, account POSTs, personal-data reads/writes, or user-owned port 3000 process lifecycle actions. The delegated writer was not authorized to stage, commit, push, or create a PR; the parent owns local work-unit commits. No remote repository delivery was authorized.
- TDD mode: standard; strict TDD is not affirmatively enabled by the known project testing context. Source: existing `odd/tasks/api-decorator-metadata.md` and API scripts. Runner: `pnpm --dir apps/api test` and isolated `pnpm --dir apps/api smoke` when safe.
- Delivery strategy: `ask-on-risk`; estimated authored changed lines: 150–250, below the advisory ~400-line threshold. Never omit proof or compress code to meet the estimate.

## Work unit and acceptance
- [x] API-TELEMETRY-01 — Instrument completed HTTP responses, including successes, guard failures, and unmatched routes. Route: delegated direct; trigger: user explicitly assigned one writer to this distinct feature on `fix/api-decorator-metadata`. Acceptance: GET `/health` logs 200, GET `/v1/auth/me` logs 401 without credentials, unknown GET logs 404 with `<unmatched>`; each line has a finite duration; no query marker or unknown literal path appears. Production emits no telemetry. Final API tests, typecheck, eligible isolated smoke, and `git diff --check` pass. Work-unit commit: `d6eb588` (`feat(api): log safe HTTP response metadata`). RDD: medium, `under_budget` for 123 committed changed lines against `7ab514c`; no review receipt.

## Progress and checks
- Initial state: clean branch `fix/api-decorator-metadata`; this task file did not exist. Bootstrap uses NestJS 12.0.1 with Express 5.2.1 and TypeScript 7.0.2; existing smoke owns its child and unique scratch build. Documentation supplied: Nest request lifecycle and Express 5 request/application API. Local installed signatures and runtime behavior were verified before source changes. Context7 library-ID resolution and a NotebookLM notebook listing were mistakenly invoked before recognizing the no-remote constraint; no remote documentation content was fetched, and no further remote calls were made.
- Initial document and full Engram mirror were read back before source edits. Express 5's matched `request.route.path` is inspected only at response completion; a strict string-template allowlist rejects wildcards and regex routes, falling back to `<unmatched>`. The `finish` event observes final response status even when guards or route matching fail. In production the observer is not installed and the existing Nest logger remains `false`.
- Final checks after source edits: `pnpm --dir apps/api test` passed 68/68 (Windows `DEP0190` warning); `pnpm --dir apps/api typecheck` exit 0; `pnpm --dir apps/api smoke` passed on smoke-owned port 3217 (development observed 200 `/health`, 401 `/v1/auth/me`, 404 `<unmatched>` with finite millisecond values; fake query token/password/marker and unknown literal segment absent from telemetry; separate production child returned 401 and emitted no telemetry); `git diff --check` exit 0 (Git line-ending notices). Before smoke, `DATABASE_URL` was unset, local database port 5433 was listening, smoke port 3217 was free, and the scratch parent existed. Smoke cleaned only its own temporary build and children. No 500 was deliberately induced; the same `finish` observer applies to completed 500 responses, but that case lacks direct runtime proof.
- Changed files: `apps/api/src/main.ts`, `apps/api/test/smoke.mjs`, and this task record; approximate authored changes under 150 lines. An unrelated untracked `odd/tasks/mobile-rial-dashboard.md` appeared during verification; it was not read, modified, or staged.

## Next step
The telemetry work unit is committed locally; RDD review is deferred under the native medium-risk slice budget. No push, PR, or merge was performed. Rollback boundary: revert only the observer in `apps/api/src/main.ts`, the telemetry assertions/production child in `apps/api/test/smoke.mjs`, and this task document; preserve the unrelated untracked task and user-owned server. A dedicated safe isolated 500-response fixture would strengthen failure coverage if later requested.
