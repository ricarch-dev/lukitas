interface DevelopmentApiEnvironment {
  readonly configuredUrl?: string;
  readonly development: boolean;
  readonly metroHost?: string | null;
  readonly browserHostname?: string;
}

/** Follow the server the device actually opened; never persist a DHCP address. */
export function resolveDevelopmentApiUrl({
  configuredUrl,
  development,
  metroHost,
  browserHostname,
}: DevelopmentApiEnvironment): string | undefined {
  if (configuredUrl !== undefined && !(development && configuredUrl === 'auto'))
    return configuredUrl;
  if (!development) return undefined;
  const host = browserHostname || (metroHost ? new URL(`http://${metroHost}`).hostname : undefined);
  if (!host) return undefined;
  const ipv4 = host.split('.');
  const localHost =
    host === 'localhost' ||
    host === '[::1]' ||
    (ipv4.length === 4 && ipv4.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255));
  if (!localHost) {
    throw new Error(
      'Cannot infer a local API from this development host. Set EXPO_PUBLIC_API_URL to a reachable API URL; an Expo tunnel only exposes Metro.',
    );
  }
  return `http://${host}:3000/v1`;
}
