# Phase 0 verification

Run from the repo root:

`pnpm install --frozen-lockfile`
`pnpm check:workspace`
`pnpm tdd:readiness`
`pnpm gate`

Phase 0 stays pinned, keeps `.atl/`, blocks early product scope, and uses the same gate command locally and in CI.
