import type { SessionTokens } from '../api/client';

export function clearSessionForLogin(
  setTokens: (tokens: SessionTokens | null) => Promise<void>,
): Promise<void> {
  return setTokens(null);
}
