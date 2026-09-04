declare module '@node-rs/argon2' {
  export const Algorithm: { readonly Argon2id: unknown };
  export function hash(password: string, options: unknown): Promise<string>;
  export function verify(encoded: string, password: string): Promise<boolean>;
}
declare module 'jose' {
  export class SignJWT {
    constructor(payload: Record<string, unknown>);
    setProtectedHeader(header: Record<string, unknown>): this;
    setSubject(subject: string): this;
    setIssuedAt(): this;
    setExpirationTime(value: string): this;
    sign(key: Uint8Array): Promise<string>;
  }
  export function jwtVerify(
    token: string,
    key: Uint8Array,
    options?: unknown,
  ): Promise<{ payload: Record<string, unknown> & { sub?: string } }>;
}
