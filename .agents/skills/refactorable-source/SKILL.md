---
name: refactorable-source
description: "Trigger: refactor, large file, maintainability, modularity. Keep handwritten source small, understandable, and reusable in Lukitas."
license: Apache-2.0
metadata:
  author: "ricarch-dev"
  version: "1.0"
---

## Activation Contract

Load this skill when a handwritten source file approaches 500 lines, a service or component has multiple responsibilities, or a change adds substantial logic.

## Hard Rules

- Keep handwritten source below 500 lines whenever possible; reaching 500 is a mandatory refactoring signal.
- Never deliver handwritten source over 800 lines. Split it before adding behavior and never target 1,000 lines.
- Split by feature, responsibility, or architectural layer, not arbitrary line ranges.
- Keep controllers thin, domain rules framework-independent, persistence adapters focused, and UI components single-purpose.
- Preserve public behavior and error semantics; add focused tests around extracted units.
- Do not manually reshape generated files, lockfiles, migrations, or vendored code to satisfy this policy.

## Decision Gates

| Situation | Action |
| --- | --- |
| File under 500 lines with one responsibility | Implement normally and keep the boundary focused. |
| File at or above 500 lines | Refactor before adding substantial logic. |
| Change would exceed 800 lines | Stop and split into smaller reusable modules first. |
| Generated or vendor artifact | Leave it generated; refactor the handwritten source around it. |

## Execution Steps

1. Measure the file and list its distinct responsibilities.
2. Find canonical types and existing reusable pieces.
3. Move one coherent responsibility at a time.
4. Run type checks and focused tests after each structural change.
5. Review readability, ownership, duplication, and final line counts.

## Output Contract

Return the responsibilities extracted, files added or reduced, behavior-preservation tests, final handwritten line counts, and any remaining refactoring debt.

## References

- [Repository engineering standards](../../../AGENTS.md)

