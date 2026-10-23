---
name: format-changed-files
description: "Trigger: create, modify, edit, or write a file. Format only files changed by this task with the repository's Prettier configuration."
license: Apache-2.0
metadata:
  author: "ricarch-dev"
  version: "1.0"
---

## Activation Contract

Load before creating or modifying a file in this repository. Apply after the last content edit and before functional verification or review.

## Hard Rules

- Format only files this task created or modified; never format the entire repository or unrelated pre-existing changes.
- Preserve `.prettierrc.json`, `.prettierignore`, and the file's nearest applicable Prettier configuration. Do not override formatting options or force ignored files.
- Use the repository-local Prettier executable only. Do not install dependencies, invoke network-backed runners, or substitute a global version.
- Formatting is source-mutating: finish it before freezing a review candidate. If formatting changes code afterward, repeat affected checks before delivery.

## Decision Gates

| File or tool state | Action |
| --- | --- |
| Supported, not ignored, local Prettier available | Format the exact path. |
| Ignored or unsupported | Leave unchanged and report the exclusion. |
| Local Prettier unavailable or formatting fails | Leave remaining files untouched; report the blocked check, without claiming formatted output. |

## Execution Steps

1. Record the exact paths created or edited by this task, excluding unrelated changes.
2. From the repository root, use the local binary (`pnpm exec prettier --write <path>`) on each eligible path after its final edit; quote paths with spaces. Do not pass a directory or `.`.
3. Check eligible paths with `pnpm exec prettier --check <path>` and inspect the resulting diff for unintended changes. Run applicable tests after formatting.

## Output Contract

Report formatted paths, excluded paths and reasons, and check results or the precise blocker.

## References

- [Repository Prettier configuration](../../../.prettierrc.json)
- [Repository formatting exclusions](../../../.prettierignore)
