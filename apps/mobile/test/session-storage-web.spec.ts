import test from "node:test";
import assert from "node:assert/strict";
import { sessionStorage } from "../src/session/storage.web.ts";

const tokens = { accessToken: "access", refreshToken: "refresh" };
const sessionKey = "lukitas.session.v1";

test("web session storage persists and clears tokens without an Expo runtime", async () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
  });
  try {
    assert.equal(await sessionStorage.read(), null);
    await sessionStorage.write(tokens);
    assert.equal(values.get(sessionKey), JSON.stringify(tokens));
    assert.deepEqual(await sessionStorage.read(), tokens);
    await sessionStorage.write(null);
    assert.equal(values.has(sessionKey), false);
    assert.equal(await sessionStorage.read(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("web session storage handles unavailable and blocked browser storage", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Reflect.deleteProperty(globalThis, "localStorage");
    assert.equal(await sessionStorage.read(), null);
    await assert.rejects(sessionStorage.write(tokens), /unavailable/i);
    await assert.rejects(sessionStorage.write(null), /unavailable/i);

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => { throw new Error("storage blocked"); },
    });
    assert.equal(await sessionStorage.read(), null);
    await assert.rejects(sessionStorage.write(tokens), /storage blocked/);

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => { throw new Error("read blocked"); },
        setItem: () => { throw new Error("quota exceeded"); },
        removeItem: () => { throw new Error("remove blocked"); },
      },
    });
    assert.equal(await sessionStorage.read(), null);
    await assert.rejects(sessionStorage.write(tokens), /quota exceeded/);
    await assert.rejects(sessionStorage.write(null), /remove blocked/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
