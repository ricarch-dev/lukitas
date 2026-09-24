import { validation } from './errors.js';

export const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    // An object that is not an array is safe for unknown-valued property reads.
    ? value as Record<string, unknown>
    : {};

export const requiredString = (value: unknown, message: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : validation(message);
