import type { SessionTokens } from "../api/client";

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SessionStorage {
  read(): Promise<SessionTokens | null>;
  write(tokens: SessionTokens | null): Promise<void>;
}

const sessionKey = "lukitas.session.v1";

export const createSessionStorage = (store: KeyValueStore): SessionStorage => ({
  async read() {
    const raw = await store.getItem(sessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SessionTokens>;
      return typeof parsed.accessToken === "string" &&
        typeof parsed.refreshToken === "string"
        ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
        : null;
    } catch {
      return null;
    }
  },
  async write(tokens) {
    if (!tokens) return store.removeItem(sessionKey);
    return store.setItem(sessionKey, JSON.stringify(tokens));
  },
});
