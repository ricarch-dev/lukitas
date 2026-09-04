import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiClient, type SessionTokens } from "../api/client";
import { sessionStorage } from "./storage";

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
    () => new ApiClient({ getTokens: () => tokens, setTokens }),
    [tokens],
  );
  return (
    <Context.Provider value={{ tokens, ready, client, setTokens }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
