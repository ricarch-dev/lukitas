# Validation and acceptance

## Before editing a UI slice

Record the current rendered screen and behavior when available. Inventory:

| Item           | Record                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| Ownership      | Module, route, canonical token and primitive                                        |
| Semantic layer | Content, navigation, floating control, or modal                                     |
| Material       | Supported iOS, Android, older iOS/web, accessibility fallback                       |
| States         | Default, pressed, selected, disabled, loading, empty, error, keyboard, long content |
| Preservation   | Labels, actions, routing, input values, money/date formatting                       |

Apply the inventory to every affected screen, not just the dashboard. Keep unauthorised screens unchanged. An app-wide migration must account for every current route/module, including authentication and onboarding; it does not permit an unrequested navigation redesign.

## Deterministic proof

Use existing mobile tests and typechecking; inspect the scripts before running:

- `pnpm --dir apps/mobile test`
- `pnpm --dir apps/mobile typecheck`
- `pnpm --dir apps/mobile smoke` when its prerequisites are available.

For a future material policy or primitive, cover each changed rule through its public interface: both capability checks, unavailable APIs, unsupported platforms, unresolved/rejected accessibility queries, reduced transparency, reduced motion, and preference changes. Verify fallback rendering does not remove handlers, labels, selection, disabled state, or input contents. Cover the existing behavior of shared consumers.

Observe RED before implementing behavior where meaningful deterministic tests exist. Markdown-only skill updates require structural readback and link/frontmatter checks instead; do not invent a visual RED/GREEN result.

Do not treat source-string checks, mocked rendering, typechecking, or a web screenshot as proof of native material quality.

## Rendered and device proof

Check at least:

- Supported iOS with actual native glass and an unsupported/disabled-capability fallback.
- Android with its tonal baseline; test any optional blur on a representative lower-performance device as well as its no-blur fallback.
- Existing light/dark variants, bright and busy scrolling backgrounds, increased contrast, reduced transparency on iOS, and reduced motion.
- VoiceOver/TalkBack labels, order, selected state, modal focus, dismissal, and return focus.
- Large font sizes, long labels, large/negative amounts, empty/loading/error states, narrow phones, landscape/tablet layouts when supported.
- Safe areas, edge-to-edge system bars, keyboard visibility, last-row reachability, tab reselect behavior, Back, and sheet dismissal.
- Web keyboard navigation and opaque fallback when the affected UI is supported on web.

Use 48 logical-unit touch targets as the project cross-platform baseline for custom controls; do not shrink larger native hit areas. Check normal text contrast at least 4.5:1, large text at least 3:1 using platform size definitions, and essential non-text indicators at least 3:1. Measure composited foreground/background states, not isolated token pairs. Add an opaque surface when changing backgrounds make contrast unreliable.

Inspect scrolling, tab transitions, opening sheets, and keyboard interaction in a native release/profile build. Compare to baseline; record device/OS, scenario, and observed frame/rendering issues. Avoid arbitrary performance guarantees and dependencies added solely for decorative animation.

## Delivery evidence

Return a compact platform/state matrix with `observed`, `failed`, or `not run` and a reason. Report exact test commands and outcomes, screenshots/device evidence when available, source versions consulted, and remaining limitations. Do not claim pixel parity, universal compatibility, or accessibility compliance from code inspection alone.
