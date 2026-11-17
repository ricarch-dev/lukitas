---
name: liquid-glass-design
description: 'Trigger: mobile UI, Liquid Glass, screens, navigation, Android adaptation. Preserve Lukitas design with native iOS glass and coherent platform fallbacks.'
license: Apache-2.0
metadata:
  author: 'Lukitas'
  version: '1.0'
---

## Activation Contract

Load for every Lukitas mobile UI addition, refinement, migration, or review, including non-glass content. Guide the whole interface; do not turn every surface into glass. Skill creation or design research alone does not authorize app changes.

## Hard Rules

- Preserve product flows, navigation, copy, financial semantics, typography, spacing, and canonical tokens. Read the current product/design documents and affected code before choosing materials.
- Reserve Liquid Glass for navigation and selected floating controls. Keep financial content, charts, forms, and reading surfaces stable and legible.
- Prefer existing native system chrome; never wrap already-glass navigation in another glass layer.
- Treat Android as a first-class platform with equivalent tasks and hierarchy, not pixel-identical Apple refraction. Always provide an intentional opaque fallback.
- Centralize material decisions in existing presentation primitives; do not scatter OS checks, duplicate tokens, or invent a second design system.
- Recheck installed versions and official documentation before using APIs. Never copy SwiftUI modifiers into React Native or assume blur equals Liquid Glass.
- Honor accessibility and performance before decoration. Never claim cross-platform fidelity from screenshots on only one platform.

## Decision Gates

| Surface or condition                                               | Required treatment                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Existing system navigation                                         | Preserve native material and platform behavior.                                           |
| Custom floating control on supported iOS                           | Use guarded native glass only after compatibility and accessibility checks.               |
| Android, older iOS, web, unavailable API, or unresolved capability | Use token-based tonal/opaque surfaces; optional measured blur is not native Liquid Glass. |
| Financial content or data-entry surface                            | Preserve content-layer surfaces, regardless of platform.                                  |
| Legibility, reduced-transparency, contrast, or performance failure | Remove decoration or increase opacity; never remove functionality.                        |

## Execution Steps

1. Read [project integration](references/project-integration.md), then inspect current tokens, routes, primitives, and relevant tests.
2. Read [platform rules](references/platform-rules.md) and [evidence](references/sources.md); refresh version-sensitive claims.
3. Inventory affected screens and states. Record each surface's role, canonical owner, iOS treatment, Android treatment, and fallback.
4. Implement only the authorized slice, reusing existing components and domain logic. Add a shared material abstraction only for genuinely shared consumers.
5. Follow [validation](references/validation.md). Observe deterministic RED before behavioral changes when a meaningful runner exists; verify native visuals separately.

## Output Contract

Return affected surfaces and reused owners, platform/fallback decisions, documentation versions, observed checks, and unverified device cases. Identify preserved patterns and any approved departures. Never describe an untested adaptation as perfect.

## References

- [Project integration](references/project-integration.md)
- [Platform rules](references/platform-rules.md)
- [Validation](references/validation.md)
- [Research sources](references/sources.md)
