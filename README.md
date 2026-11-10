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

### Configure the local API

Set `EXPO_PUBLIC_API_URL` to your computer's Wi-Fi IPv4 address, including the
API port and `/v1` prefix. For example, in PowerShell from the repository root:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://<computer-wifi-ip>:3000/v1'
pnpm --dir apps/mobile start --clear
```

Replace `<computer-wifi-ip>` before running the command. Keep that terminal
open while using the app. You can also create `apps/mobile/.env.local` yourself
with `EXPO_PUBLIC_API_URL=http://<computer-wifi-ip>:3000/v1`, then restart Metro.
Never store database credentials or other secrets in an `EXPO_PUBLIC_` variable.
An explicit `ApiClient({ baseUrl })` takes precedence over this environment
setting; the existing loopback fallback is retained when neither is supplied.

The project's development database runs separately from native PostgreSQL:

```sh
docker compose --project-name lukitas -f infra/docker/compose.yml up --detach --wait postgres
pnpm --dir apps/api start
```

The Compose database uses host port `5433` and the development credentials
declared in `infra/docker/compose.yml`, matching the API's existing fallback.
Schema initialization is separate: never reset or migrate an existing database
merely to resolve a connection error. A new database has no application users;
create a Lukitas account in the app, separate from your Expo account.

For other existing databases, set `DATABASE_URL` in the API terminal or create
`apps/api/.env.local` yourself. API `start` loads optional `.env`, then
`.env.local` from `apps/api`; existing process variables override both. This
loading does not automatically apply to Prisma CLI commands. Local env files
are git-ignored and may be protected from agent edits by your OpenCode policy.

Open `http://<computer-wifi-ip>:3000/health` on the iPhone to check connectivity.
A healthy database returns `{"ok":true,"database":"up"}`. Allow API port `3000`
only on your trusted private network if a firewall blocks the connection.
