export function normalizeAuthEmail(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\S+@\S+\.\S+$/.test(value.trim())) return null;
  return value.trim().toLowerCase();
}

export function isValidRegistrationPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8;
}
