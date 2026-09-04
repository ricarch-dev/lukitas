import test from "node:test";
import assert from "node:assert/strict";
import { createSessionStorage } from "../src/session/storage-core.ts";

test("session storage persists, restores and clears valid token pairs", async () => {
  const values = new Map<string, string>();
  const storage = createSessionStorage({
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  });
  await storage.write({ accessToken: "access", refreshToken: "refresh" });
  assert.deepEqual(await storage.read(), {
    accessToken: "access",
    refreshToken: "refresh",
  });
  await storage.write(null);
  assert.equal(await storage.read(), null);
});
