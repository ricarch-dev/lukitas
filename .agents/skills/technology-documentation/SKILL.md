---
name: technology-documentation
description: "Trigger: docs, documentation, library, framework, SDK, API, upgrade. Verify version-specific technology decisions against official documentation."
license: Apache-2.0
metadata:
  author: "ricarch-dev"
  version: "1.0"
---

## Activation Contract

Load this skill before using, changing, upgrading, or integrating a dependency, framework, SDK, database feature, or platform API in Lukitas.

## Hard Rules

- Identify the exact installed version from manifests, the lockfile, workspace configuration, and relevant TypeScript configuration.
- Read official documentation for that version before choosing an API, configuration, integration pattern, or migration path.
- For upgrades, read the official release notes and migration guide for the complete version transition.
- Verify signatures, lifecycle behavior, platform constraints, and deprecations; do not rely on memory or examples from another major version.
- If official documentation is unavailable or conflicts with installed behavior, verify local type declarations or source and report the limitation.
- Do not add a dependency without checking compatibility, maintenance, and architectural fit.

## Decision Gates

| Situation | Action |
| --- | --- |
| Existing dependency | Confirm its installed version and consult its matching official docs. |
| New dependency or integration | Verify official docs, compatibility, maintenance, and project fit before adoption. |
| Upgrade or migration | Read release notes and migration guidance before editing code. |
| Documentation unavailable or contradictory | Verify installed types/source and record the uncertainty; do not guess. |

## Execution Steps

1. Read the relevant manifest, lockfile entry, and project configuration.
2. Consult the official documentation and migration notes for the exact version.
3. Record version-sensitive constraints and documentation sources.
4. Implement the smallest compatible change.
5. Run the relevant type checks and tests; revisit the docs if behavior differs.

## Output Contract

Return the technology and exact version, documentation sources consulted, constraints discovered, implementation impact, and validation commands. Report unavailable or conflicting documentation explicitly.

## References

- [Repository engineering standards](../../../AGENTS.md)
- [Workspace manifest](../../../package.json)
- [Workspace dependency policy](../../../pnpm-workspace.yaml)
- [Pinned dependency lockfile](../../../pnpm-lock.yaml)

