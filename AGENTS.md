# Lukitas Engineering Standards

These instructions apply to the entire repository. More-specific `AGENTS.md` files may add constraints for their own directory, but they must not weaken these standards for application or package source code.

## Non-negotiable rules

### 1. Zero `any`

- Do not introduce or keep the TypeScript `any` type in handwritten source code.
- This includes explicit annotations, assertions such as `as any`, generic constraints, callback parameters, and framework handler bodies that silently widen to `any`.
- Use the narrowest useful type. At untrusted boundaries, accept `unknown`, validate it, and narrow it before use.
- Use typed DTOs, discriminated unions, generated Prisma types, and explicit domain/contracts types instead of weakening the type system.
- Do not hide a typing problem with a cast. If a cast is unavoidable at an integration boundary, isolate it, document the invariant, and add a test that proves it.
- Existing violations are technical debt, not precedent. Any touched source file must not gain new violations and should remove the violations in the touched code path.

### 2. Normalize before duplicating

- Search for an existing type, validator, mapper, constant, utility, component, or service before creating another one.
- Keep each business concept canonical: define it in the appropriate domain or contracts package and reuse it across API and mobile layers.
- Do not copy-paste behavior, DTOs, API shapes, validation rules, magic strings, or formatting logic when the semantics are the same.
- Extract shared code only when the behavior and invariants are genuinely shared; do not create speculative `utils` abstractions that obscure ownership.
- Prefer established repository naming, folder structure, module boundaries, and patterns over introducing a parallel convention.
- When two representations are intentionally different, make the transformation explicit at the boundary instead of pretending they are the same type.

### 3. Keep code small and refactor continuously

- Handwritten source files should normally remain below 500 lines.
- Treat 500 lines as a refactoring signal: split by feature, responsibility, or layer before adding more complexity.
- 800 lines is the absolute ceiling for handwritten source. A change that would exceed it must be refactored into smaller reusable modules first; never target 1,000 lines.
- Generated files, lockfiles, migrations, and vendored code are excluded from this line budget and must not be manually reshaped to satisfy it.
- Every module, service, component, and function must have one clear responsibility and a name that explains its role.
- Prefer small composable functions and focused modules. Avoid god files, god services, deep conditional branching, and broad catch-all utility modules.
- Refactoring must preserve behavior. Add or update focused tests when extracting, normalizing, or moving logic.

### 4. Verify technology documentation before implementation

- Before using, changing, upgrading, or integrating a library, framework, SDK, database feature, or platform API, read the official documentation for the exact version used by this repository.
- Confirm the version from `package.json`, the lockfile, workspace manifests, and relevant TypeScript configuration before relying on an API.
- For upgrades or migrations, also read the official release notes and migration guide for the version transition.
- Do not rely on memory, stale snippets, or documentation for a different major version. If official documentation is unavailable, verify behavior against installed type declarations/source and state the limitation.
- Record documentation sources and version-sensitive decisions in the implementation or review summary when they materially affect the change.
- Do not add a dependency or adopt a new pattern without checking its official documentation, maintenance status, and fit with the existing architecture.

## Required workflow

1. Inspect the existing module, canonical types, and nearby tests before editing.
2. Identify the technology versions involved and consult their official documentation.
3. Design the smallest normalized change that preserves existing boundaries.
4. Implement with strict types, reusable units, and no duplicated behavior.
5. Refactor before delivery if a handwritten file reaches 500 lines or the change creates a second source of truth.
6. Validate the relevant type checks and tests, then inspect the diff for `any`, duplication, oversized files, and undocumented version-sensitive assumptions.

## Project skill registration

Load the exact project skill that matches the change before implementation:

- `type-safe-development` — `.agents/skills/type-safe-development/SKILL.md`
- `normalized-reuse` — `.agents/skills/normalized-reuse/SKILL.md`
- `refactorable-source` — `.agents/skills/refactorable-source/SKILL.md`
- `technology-documentation` — `.agents/skills/technology-documentation/SKILL.md`

## Definition of done

A change is not ready when it merely works. It is ready only when it is strongly typed, normalized around canonical sources, split into understandable reusable units, verified against current official technology documentation, and covered by the relevant checks.
