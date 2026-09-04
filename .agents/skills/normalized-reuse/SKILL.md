---
name: normalized-reuse
description: "Trigger: duplicate, normalize, reuse, DRY, canonical, redundancy. Consolidate shared concepts into canonical reusable modules in Lukitas."
license: Apache-2.0
metadata:
  author: "ricarch-dev"
  version: "1.0"
---

## Activation Contract

Load this skill when adding or refactoring domain concepts, API contracts, validation, mapping, constants, shared UI behavior, or repeated logic in the Lukitas monorepo.

## Hard Rules

- Search for existing types, schemas, DTOs, validators, mappers, constants, components, services, and helpers before creating new ones.
- Give each business concept one canonical owner: domain rules in `packages/domain`, cross-boundary shapes in `packages/contracts`, and infrastructure in its application module.
- Do not copy behavior, validation rules, API shapes, formatting logic, or magic strings when the semantics are the same.
- Extract shared code only when semantics, invariants, and ownership are shared; reject speculative catch-all utilities.
- Keep intentional differences explicit through boundary transformations.

## Decision Gates

| Situation | Action |
| --- | --- |
| Equivalent concept already exists | Reuse the canonical implementation and update its callers. |
| Same invariant crosses packages | Move the shared contract to its owning package. |
| Similar shape but different invariants | Keep separate models and add an explicit mapper. |
| Broad helper has no clear owner | Do not add it; keep the logic near its feature. |

## Execution Steps

1. Map the concept, current definitions, and dependents.
2. Select the canonical owner using existing repository boundaries.
3. Consolidate the smallest coherent unit and update callers.
4. Remove obsolete duplicates and stale names.
5. Run type checks and focused tests, then inspect the diff for new sources of truth.

## Output Contract

Return the canonical owner, reused or removed definitions, affected callers, and the tests that prove behavior remained consistent. Explain any intentionally separate representation.

## References

- [Repository engineering standards](../../../AGENTS.md)
- [Domain package entry point](../../../packages/domain/src/index.ts)
- [Contracts package entry point](../../../packages/contracts/src/index.ts)

