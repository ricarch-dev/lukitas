# First-account onboarding design

## Objective and authorized scope
Redesign the first-account form shown by the user, preserving the existing USD onboarding endpoint and initial balance semantics. Make the form usable on phones and bounded on desktop; do not create real accounts, change API/business scope, add dependencies, push, or open a PR.

## Problem and approach
The current screen stretches two unlabeled fields across desktop. It also sets a local done flag without notifying the navigator, leaving users on “Loading dashboard”. Extract a focused onboarding screen, use the existing financial contracts and domain money validation, and notify navigation only after confirmed completion.

## Design constraints
- Spanish UI continues the entry experience required by PRODUCT.md; code/docs stay English.
- Reuse AUTH_COLORS for legibility and feedback; a lime action accent echoes the existing dashboard without copying Rial assets.
- Visible labels, clear USD denomination, keyboard scrolling, focus states, busy lock, recoverable error feedback, no fake controls.
- Strict TDD disabled: openspec/config.yaml (`strict_tdd: false`); runner `pnpm --dir apps/mobile test`. Ordinary tests remain required.
- RDD: enabled by global preference, verified with an escalated read-only status after sandbox identity access initially failed. Prospective risk: medium, under_budget (351 lines at that assessment). No review actors started.
- Documentation: React Native 0.86 TextInput, Pressable, KeyboardAvoidingView official docs; Expo 57.0.20, RN 0.86.3, React 19.2.3 from mobile manifest.

## Delivery
Strategy: ask-on-risk. Forecast: ~360 authored lines. Work-unit actual: 371 authored additions/deletions including its task document (342 source/tests). Current branch: fix/api-decorator-metadata (non-default); preserve unrelated work. One coherent work unit.

## Tasks
- [x] ONB-1: Extract and redesign the typed onboarding form, preserve its payload, complete navigator handoff, and add focused tests. Route: delegated-direct attempted (preparation/mapping trigger); worker failed due account usage limit. Continued inline under user's “continua” instruction with a recorded unavailable delegate. Checks: typecheck PASS, tests 19/19 PASS, Expo smoke PASS, diff/any/line scans PASS. Commit: `4d08814`; visual QA unavailable.

## Evidence and next step
- CodeGraph index exists; upstream CLI unavailable in PATH. Scoped source reads used as fallback.
- Browser visual QA blocked by automatic approval review usage limit. No alternate browser or bypass attempted. Native device QA remains pending.
- Engram mirror: pending. MCP writes failed because multiple active sessions match the project; no session identity was guessed.
- Implementation and functional checks complete. Typecheck passed; mobile tests passed 19/19, including amount/payload/validation, handoff structure and contrast. Expo smoke passed after escalation for installed-module reads. Diff check and zero-any scans passed. No real accounts or user-owned services touched.
- Committed native risk assessment: `gentle-ai review assess --cwd <repo> --agent codex --base-ref e48aa13 --committed-only --json`: medium, `review_due=false`, `under_budget` (371 lines). Pending slice boundary remains `e48aa13`; no reviewer or approval claim.
- Next: inspect the rendered form on desktop/mobile when browser access is restored. Native-device QA remains pending. No push/PR.
- Rollback: revert the onboarding screen/helper/tests and its narrow feature export and navigator handoff; dashboard/auth/API remain unchanged.
