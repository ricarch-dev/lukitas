# lukitas

Phase 0 bootstrap for the finance monorepo.

- Node `24.20.0` / pnpm `11.24.0` / TypeScript `7.0.2`
- Gates: `pnpm check:workspace`, `pnpm tdd:readiness`, `pnpm gate`
- Scope: pinned workspace plus launchable Expo/NestJS shells; no product workflows or domain packages yet; `.atl/` stays ignored.

## Open on an iPhone

Use Node `24.20.0` and pnpm `11.24.0`, then run from the repository root:

```sh
pnpm install
pnpm --dir apps/mobile start
```

The mobile app targets Expo SDK 58. Install its matching Expo Go on your iPhone,
connect the phone and computer to the same Wi-Fi network, and scan the terminal
QR code with the iPhone camera. Allow local-network access when iOS asks. The
start command selects Expo Go explicitly; do not switch to a development build
unless you have compiled and installed one separately. Allow Metro's port 19006
through the computer's firewall on your trusted private network if necessary.

For the browser, use `pnpm --dir apps/mobile start:web`. Check SDK dependencies
with `pnpm --dir apps/mobile exec expo install --check`.

Rendering the app does not start the backend. Login and data operations also
require a running API reachable from the phone; `127.0.0.1` on an iPhone refers
to the phone itself, not the development computer.
