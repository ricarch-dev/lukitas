# Auth entry experience

## Objective
Let a new user create an account with email and password from the app, and replace the bare sign-in screen with a responsive, accessible entry experience inspired by the provided reference without copying its identity.

## Problem and why
The API already supports registration, but the mobile/web app exposes only sign-in and its current screen stretches edge to edge on desktop. Users must use a separate terminal to register.

## Scope and constraints
- Authorized: mobile authentication UI and its focused contracts/tests; reuse the existing `/auth/register`, `/auth/login`, session storage and navigation. Do not add a backend signup flow or dependencies unless evidence requires it.
- Preserve unrelated work, including the pre-existing web session-storage fix; never include unrelated files in a work-unit commit.
- Design: distinct Lukitas identity, responsive web/native layout, visible sign-in/create-account switch, clear form states and keyboard/screen-reader labels. Avoid copying the reference logo, QR code, or exact palette.
- Artifact language: English, consistent with the app's current UI. Never include real credentials or personal data.
- TDD: Standard (strict TDD disabled), source: project testing context `sdd-init/lukitas` records `strict_tdd: false` without an affirmative enable setting. Runner: `pnpm --dir apps/mobile test`; also run mobile typecheck and applicable checks.
- Delivery: ask-on-risk. Estimated 250–400 authored changed lines; 400 is advisory per task and an accumulated delivery trigger, not a code-size target. Review switch is user-owned; no remote operation authorized.

## Work units
- [x] AUTH-01 — Reuse typed auth response/request contracts and wire registration into the session boundary with focused tests for success, invalid input, duplicate email and failure without storing tokens. Route: delegated direct; changes span multiple non-trivial files and reading prepares the write. Acceptance: typed registration action is ready for AUTH-02 to expose, saves valid tokens for normal onboarding; login stays intact. Checks: mobile 9/9, auth 5/5, domain 76/76, API 66/66; mobile/domain/API typechecks passed; parent reran mobile typecheck; diff whitespace passed. Runtime API call N/A: no disposable live API/database was started for this isolated auth helper; API behavior is covered by existing tests and integration remains to verify. Commit: pending. RDD: pending.
- [ ] AUTH-02 — Replace the bare auth view with a distinct, responsive login/registration UI and accessible form states; test mode switching and the rendered flow, without changing other screens. Route: delegated direct; UI plus behavior/tests touch multiple non-trivial files. Acceptance: desktop and narrow screens offer sign-in and create account, loading/errors are understandable, password remains obscured by default. Checks: mobile test, typecheck, web bundle or visual runtime check if available, focused regression tests. Commit: pending. RDD: pending.

## Progress and verification
- AUTH-01 implemented and verified on `feat/auth-entry-experience`, branched from `08780ac1c8008bc12c408c356564b0e8a1fadf06`. Shared domain normalization matches the server; auth contract types remove the touched login path's `any`. No login UI change yet.
- Forecast: two small work-unit commits; determine actual authored count from commits before any delivery decision. Branch point: `08780ac1c8008bc12c408c356564b0e8a1fadf06`; slice boundaries pending.

## Next step
Commit AUTH-01 with its tests, then implement AUTH-02 and verify the complete entry experience.
