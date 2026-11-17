import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { ApiClient, type SessionTokens } from '../api/client';
import { resolveDevelopmentApiUrl } from '../api/development-api-url';
import { sessionStorage } from './storage';

interface SessionContextValue {
  readonly tokens: SessionTokens | null;
  readonly ready: boolean;
  readonly client: ApiClient;
  readonly setTokens: (tokens: SessionTokens | null) => Promise<void>;
}
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokensState] = useState<SessionTokens | null>(null);
  const [ready, setReady] = useState(false);
  const setTokens = async (next: SessionTokens | null) => {
    setTokensState(next);
    await sessionStorage.write(next);
  };
  useEffect(() => {
    sessionStorage.read().then((value) => {
      setTokensState(value);
      setReady(true);
    });
  }, []);
  const client = useMemo(
    () =>
      new ApiClient({
        baseUrl: resolveDevelopmentApiUrl({
          configuredUrl: process.env.EXPO_PUBLIC_API_URL,
          development: __DEV__,
          metroHost: Constants.expoConfig?.hostUri,
          browserHostname: typeof window !== 'undefined' ? window.location?.hostname : undefined,
        }),
        getTokens: () => tokens,
        setTokens,
      }),
    [tokens],
  );
  return (
    <Context.Provider value={{ tokens, ready, client, setTokens }}>{children}</Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
