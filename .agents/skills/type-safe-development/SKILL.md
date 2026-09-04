---
name: type-safe-development
description: "Trigger: TypeScript, types, any, DTO, type safety. Enforce zero-any TypeScript with safe boundaries in Lukitas."
license: Apache-2.0
metadata:
  author: "ricarch-dev"
  version: "1.0"
---

## Activation Contract

Load this skill when creating, reviewing, or modifying TypeScript in the Lukitas monorepo, especially API DTOs, request handlers, domain models, contracts, configuration, and React props.

## Hard Rules

- Never introduce explicit, implicit, asserted, or generic `any` in handwritten source.
- Accept `unknown` at untrusted boundaries, validate it, and narrow it before passing it inward.
- Use DTOs, discriminated unions, domain-specific types, and generated Prisma types instead of broad casts.
- Keep domain rules in `packages/domain` and cross-boundary shapes in `packages/contracts`.
- Isolate and test any unavoidable integration cast; never use `as any` to silence a compiler error.

## Decision Gates

| Situation | Action |
| --- | --- |
| External or untyped input | Model as `unknown`, validate at the boundary, then narrow. |
| Shared business shape | Reuse the canonical domain or contracts type. |
| Framework boundary | Add an explicit DTO, request, prop, event, or return type. |
| Existing `any` | Replace it with the real type or a validated boundary type before extending the path. |

## Execution Steps

1. Identify the boundary and its canonical owner.
2. Model valid states before writing control flow.
3. Validate external data once and pass narrowed values inward.
4. Run the relevant compiler and tests.
5. Scan changed source for `any`, unsafe casts, and widened return types.

## Output Contract

Return the changed files, the canonical types used, the boundary validation added, and the type-check/test commands run. Report any remaining pre-existing typing debt explicitly.

## References

- [Repository engineering standards](../../../AGENTS.md)
- [API TypeScript configuration](../../../apps/api/tsconfig.json)
- [Mobile TypeScript configuration](../../../apps/mobile/tsconfig.json)
- [Domain TypeScript configuration](../../../packages/domain/tsconfig.json)
- [Contracts TypeScript configuration](../../../packages/contracts/tsconfig.json)

