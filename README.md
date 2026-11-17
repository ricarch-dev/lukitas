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

### Start the local API before Expo

No saved Wi-Fi IP is required for the default local setup. In development,
the iPhone app follows the host in the Expo manifest, and the web app follows
the browser hostname, using API port `3000` and prefix `/v1`. Restart Expo and
scan the new QR code after changing networks. The phone still needs access to
the computer on the same network; an Expo tunnel does not tunnel the API.

Both `start` and `start:web` check `/health` (including database readiness)
before opening Expo. The check times out after five seconds and stops with an
actionable error instead of opening an app whose local backend is unavailable.
It does not start the API, apply migrations, or change database files.

The API stores data in a local SQLite file. No Docker database is needed:

```sh
pnpm --dir apps/api start
```

Keep that terminal running. In a second terminal, run either:

```sh
pnpm --dir apps/mobile start
# or:
pnpm --dir apps/mobile start:web
```

An explicit `EXPO_PUBLIC_API_URL` still overrides automatic discovery. For a
non-default API port or a remote API, set the full URL in the Expo terminal
(for example, `$env:EXPO_PUBLIC_API_URL = 'http://localhost:3217/v1'` in PowerShell).
The startup check uses that URL's origin and `/health`; the endpoint must return
`{"ok":true,"database":"up"}`. Never put secrets in this public variable.
For local startup, the launcher sets the public URL to the reserved value `auto`
unless your terminal supplies an explicit URL. This takes precedence over a
saved `.env.local` IP without editing that file or disabling other dotenv
settings. Custom API URLs must be supplied in the Expo terminal for these
local commands. To clear an old terminal override in PowerShell, run
`Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue`, restart
Expo with `--clear`, and reload the app.
An explicit `ApiClient({ baseUrl })` still takes precedence. Production URL
selection and the client's unconfigured loopback fallback are unchanged.
Use `start --help` or `start:web --help` for forwarded Expo options.

The start command applies the forward SQLite migration before starting the API.
The default file is `apps/api/prisma/dev.db` (git-ignored). The database begins
with currency metadata but no application users; create a Lukitas account in
the app, separate from your Expo account. Monetary amounts and rates are stored
as exact decimal strings. Existing PostgreSQL data and migration files remain
untouched; they are not imported into SQLite.

To use a different SQLite file, set `DATABASE_URL=file:<path>` in the API
terminal or `apps/api/.env.local`. API `start` loads optional `.env`, then
`.env.local` from `apps/api` for both migrations and the server; process
variables override both. Standalone Prisma CLI commands use the default path
or an explicit `DATABASE_URL` (they do not load `.env.local` automatically).
Local env files are git-ignored. Do not delete the SQLite file to troubleshoot
connectivity; back it up before moving it or changing paths.

Open `http://<computer-wifi-ip>:3000/health` on the phone to check connectivity.
A healthy database returns `{"ok":true,"database":"up"}`. Allow API port `3000`
only on your trusted private network if a firewall blocks the connection.
SQLite removes the PostgreSQL setup, not the need for phone-to-API network access.
