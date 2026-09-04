import { createHash, randomBytes } from "node:crypto";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";

const secret = () =>
  process.env.JWT_SECRET ?? "lukitas-development-secret-change-me";
const signingKey = () => new TextEncoder().encode(secret());

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  try {
    return await verify(encoded, password);
  } catch {
    return false;
  }
}
export function opaqueToken(): string {
  return randomBytes(48).toString("base64url");
}
export function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export async function signAccessToken(
  subject: string,
  onboardingComplete: boolean,
): Promise<string> {
  return new SignJWT({ onboardingComplete })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(signingKey());
}
export async function verifyAccessToken(
  token: string,
): Promise<{ sub: string; onboardingComplete?: boolean }> {
  const { payload } = await jwtVerify(token, signingKey(), {
    algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
  return {
    sub: payload.sub,
    onboardingComplete:
      typeof payload.onboardingComplete === "boolean"
        ? payload.onboardingComplete
        : undefined,
  };
}
