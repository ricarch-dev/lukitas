import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export function expoArguments(mode, args) {
  if (!['native', 'web'].includes(mode)) throw new Error('Choose native or web.');
  return ['start', ...(mode === 'web' ? ['--web'] : ['--go', '--lan']), '--port', '19006', ...args];
}

export async function checkLocalApi(configuredUrl, request = fetch) {
  try {
    const url = new URL('/health', configuredUrl ?? 'http://127.0.0.1:3000/v1');
    const response = await request(url.href, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    const health = await response.json();
    if (!response.ok || health?.ok !== true || health?.database !== 'up') {
      throw new Error('API or database is unhealthy.');
    }
  } catch {
    throw new Error(
      'API health check failed. Start the backend in another terminal: pnpm --dir apps/api start. If already running, check EXPO_PUBLIC_API_URL and /health. No database files were changed.',
    );
  }
}

async function launchExpo(args) {
  const require = createRequire(import.meta.url);
  const cli = require.resolve('expo/bin/cli');
  // Run Expo in this process so terminal input, signals and exit codes stay native.
  process.argv = [process.execPath, cli, ...args];
  await import(pathToFileURL(cli).href);
}

export async function startLocal(
  mode,
  args,
  { env = process.env, check = checkLocalApi, launch = launchExpo, log = console.info } = {},
) {
  const forwarded = expoArguments(mode, args);
  if (!args.includes('--help') && !args.includes('-h')) {
    await check(env.EXPO_PUBLIC_API_URL === 'auto' ? undefined : env.EXPO_PUBLIC_API_URL);
    log('API and database are healthy. Opening Expo; keep the API terminal running.');
  }
  // A process value wins over dotenv, so an old saved DHCP address cannot return.
  // Other environment variables and explicit terminal URLs remain untouched.
  env.EXPO_PUBLIC_API_URL ??= 'auto';
  await launch(forwarded);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLocal(process.argv[2], process.argv.slice(3)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
