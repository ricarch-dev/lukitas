# Home Reference Layout

## Objective, problem, and why

Make the Lukitas home screen follow the user-supplied mobile finance layout: compact brand header, prominent balance, adjacent income and expense summaries, readily visible account balances, and a reachable add-account action. The current stacked dashboard panels leave a large empty area on phones and hide the account list below the fold.

## Scope and constraints

- Authorized scope: existing home dashboard UI, its focused tests, and the smallest navigation-shell adjustment strictly required to keep the mobile presentation usable.
- Keep Lukitas identity, existing account/dashboard data and currency semantics, supported destinations, and the current changes already present in the worktree.
- No Rial logo, assets, or exact proprietary visuals; adapt the layout to Lukitas rather than copying the original interface.
- Exclude chart, donation card, fake exchange-rate comparisons, widgets, calculator, payment controls, and other unsupported actions.
- Account balances must stay in their own currency; never invent conversion or silently replace partial totals.
- Existing non-home dirty files must remain intact. Do not commit pre-existing work accidentally.

## Tasks and acceptance

- [x] H-01 (delegated direct, two or more non-trivial source/test files): Recompose the home screen for narrow mobile viewports. Keep visible financial disclosure and loading/empty/error states. Provide working links to existing destinations and create-account route. Verify responsive structure and accessibility labels. Added a web-only bottom tab shell so the four existing routes do not render as a clipped top strip on narrow browsers. Test-first RED/GREEN observed for home hierarchy and web shell.
- [ ] H-02 (delegated direct verification): Reopened after the user reported a web runtime crash: `Couldn't find any screens for the navigator` in the custom Tabs layout. Corrected route registration by moving TabList to a direct child of Tabs. The next authenticated browser capture confirmed tabs render, but exposed another issue: Inicio used `/(tabs)/index`, a not-found route. Changed its href to `/(tabs)` after a focused RED test. A later screenshot showed the account action unstyled at the lower left; replaced its Link-asChild Pressable callback style with a static style anchored `right: gutter`. Focused RED/GREEN observed, typecheck, 34/34 tests, smoke, and `git diff --check` passed. Authenticated browser click-through and button position remain pending; smoke does not mount the route.

## Verification

- `pnpm --dir apps/mobile typecheck`
- `pnpm --dir apps/mobile test`
- `pnpm --dir apps/mobile smoke`
- `git diff --check`
- Mobile browser/device visual inspection remains pending unless a rendering tool is available.

## Delivery

- Feature branch: `feat/home-reference-layout` (created before the first source write).
- Strategy: ask-on-risk; initial forecast approximately 250–400 authored changed lines, excluding unrelated pre-existing changes. Reassess before any commit if the scope exceeds approximately 400.
- Base branch has eleven pre-existing modified files. A work-unit commit is safe only if it can exclude all unrelated changes, including prior edits within the same home/test files; otherwise preserve the worktree and report why it was not made.
- Native review authority for the earlier candidate was explicitly abandoned by user authorization; any unrelated active lineage must not be inferred as authority for this candidate.

## Progress and next step

- Dashboard content was reordered and Home-only styles extracted, while preserving real totals, partial-total disclosures, native-currency account amounts, and the manual add-account route. A platform-specific web shell places four existing tab destinations below the page; native tabs were not changed.
- Parent reran mobile typecheck and 34/34 tests after the button-style correction; smoke and diff check also passed. These checks do not replace browser visual and click-through verification.
- Commit pending: pre-existing uncommitted changes on the source/test paths overlap this new slice and cannot be staged as a clean work unit without including unrelated work. No pre-existing changes were discarded or committed.
- Native review outcome for this new candidate is pending; the distinct pre-existing active lineage is not this candidate's authority.
- Next: refresh the authenticated browser and confirm Inicio opens via the corrected group-root href and the Agregar cuenta button appears on the right above navigation; then reassess the changed candidate under user-owned review mode. Navigation and visual success have not been observed yet.
