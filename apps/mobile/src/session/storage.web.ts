import { createSessionStorage } from "./storage-core.ts";

// Browser localStorage is persistent but not encrypted like native SecureStore.
function browserStorage(): Storage {
  if (typeof localStorage === "undefined") {
    throw new Error("Web session storage is unavailable");
  }
  return localStorage;
}

export const sessionStorage = createSessionStorage({
  async getItem(key) {
    try {
      return browserStorage().getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    browserStorage().setItem(key, value);
  },
  async removeItem(key) {
    browserStorage().removeItem(key);
  },
});
