/**
 * Private normalized decimal kernel.
 *
 * Representation: (coefficient: bigint, scale: number)
 * Semantic value: coefficient / 10^scale
 *
 * Invariants:
 *  - scale >= 0 (always non-negative)
 *  - Number is never accepted as input
 *  - Exponent notation (e/E) is rejected
 *  - Malformed, non-finite, and unrepresentable strings are rejected
 */

export type DecimalInput = string | bigint;
export type RoundingMode = 'HALF_UP';

export interface ReciprocalRounding {
  readonly precision: number;
  readonly mode: RoundingMode;
}

/** Normalized decimal value: value = coefficient / 10^scale */
export interface Decimal {
  readonly coefficient: bigint;
  readonly scale: number;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a DecimalInput into a normalized Decimal.
 * Throws on any invalid input.
 */
export function parseDecimal(input: DecimalInput): Decimal {
  if (typeof input === 'number') {
    // Number is explicitly rejected — but TypeScript's type prevents it.
    // Runtime guard for JS callers.
    throw new TypeError('Number inputs are not accepted; use string or bigint');
  }

  if (typeof input === 'bigint') {
    return { coefficient: input, scale: 0 };
  }

  // string path
  const s = input.trim();

  if (s === '') {
    throw new RangeError(`Decimal input is empty`);
  }

  // Reject exponent notation
  if (/[eE]/.test(s)) {
    throw new RangeError(`Decimal input with exponent notation is not accepted: "${s}"`);
  }

  // Reject non-finite descriptors
  if (s === 'Infinity' || s === '-Infinity' || s === 'NaN' || s === '+Infinity') {
    throw new RangeError(`Non-finite value is not accepted: "${s}"`);
  }

  // Parse optional sign + integer + optional fractional
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!match) {
    throw new RangeError(`Malformed decimal string: "${s}"`);
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const intPart = match[2];
  const fracPart = match[3] ?? '';
  const scale = fracPart.length;
  const coefficient = sign * BigInt(intPart + fracPart);

  return { coefficient, scale };
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Returns an equivalent Decimal at exactly `targetScale`.
 * Throws if targetScale < current scale (would require truncation — caller must
 * decide rounding explicitly).
 */
export function scaleUp(d: Decimal, targetScale: number): Decimal {
  if (targetScale < d.scale) {
    throw new RangeError(`Cannot scale down from ${d.scale} to ${targetScale} without rounding`);
  }
  if (targetScale === d.scale) return d;
  const factor = 10n ** BigInt(targetScale - d.scale);
  return { coefficient: d.coefficient * factor, scale: targetScale };
}

/**
 * Reduces scale to `targetScale` using the given rounding mode.
 * Performs a single rounding operation.
 */
export function scaleDown(d: Decimal, targetScale: number, mode: RoundingMode): Decimal {
  if (targetScale >= d.scale) return scaleUp(d, targetScale);
  const steps = d.scale - targetScale;
  const divisor = 10n ** BigInt(steps);
  const remainder = absBigInt(d.coefficient) % divisor;
  const halfway = divisor / 2n;
  const truncated = d.coefficient / divisor;

  if (mode === 'HALF_UP') {
    if (remainder >= halfway) {
      const bump = d.coefficient >= 0n ? 1n : -1n;
      return { coefficient: truncated + bump, scale: targetScale };
    }
    return { coefficient: truncated, scale: targetScale };
  }

  // unreachable — RoundingMode is a union with only HALF_UP today
  return { coefficient: truncated, scale: targetScale };
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/** Adds two Decimals. Result scale is max(a.scale, b.scale). */
export function addDecimal(a: Decimal, b: Decimal): Decimal {
  const s = Math.max(a.scale, b.scale);
  const aa = scaleUp(a, s);
  const bb = scaleUp(b, s);
  return { coefficient: aa.coefficient + bb.coefficient, scale: s };
}

/** Subtracts b from a. Result scale is max(a.scale, b.scale). */
export function subtractDecimal(a: Decimal, b: Decimal): Decimal {
  const s = Math.max(a.scale, b.scale);
  const aa = scaleUp(a, s);
  const bb = scaleUp(b, s);
  return { coefficient: aa.coefficient - bb.coefficient, scale: s };
}

/**
 * Multiplies two Decimals. Result scale = a.scale + b.scale.
 */
export function multiplyDecimal(a: Decimal, b: Decimal): Decimal {
  return {
    coefficient: a.coefficient * b.coefficient,
    scale: a.scale + b.scale,
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/** Compares two Decimals. Returns -1, 0, or 1. */
export function compareDecimal(a: Decimal, b: Decimal): -1 | 0 | 1 {
  const s = Math.max(a.scale, b.scale);
  const aa = scaleUp(a, s);
  const bb = scaleUp(b, s);
  if (aa.coefficient < bb.coefficient) return -1;
  if (aa.coefficient > bb.coefficient) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Conversion to display string
// ---------------------------------------------------------------------------

/**
 * Converts a Decimal to its canonical string representation at exactly
 * `precision` decimal places. Requires the Decimal to already be at that scale
 * (use scaleDown/scaleUp first if needed).
 */
export function decimalToString(d: Decimal, scale: number): string {
  const aligned = scaleUp(d, scale);
  const abs = absBigInt(aligned.coefficient);
  const negative = aligned.coefficient < 0n;
  const raw = abs.toString().padStart(scale + 1, '0');
  const intPart = raw.slice(0, raw.length - scale) || '0';
  const fracPart = scale > 0 ? '.' + raw.slice(raw.length - scale) : '';
  return (negative ? '-' : '') + intPart + fracPart;
}

// ---------------------------------------------------------------------------
// Reciprocal
// ---------------------------------------------------------------------------

/**
 * Computes the reciprocal (1/d) of a non-zero Decimal.
 *
 * Terminating reciprocals (where result scale is determined by the input
 * coefficient being a product of only 2s and 5s) are computed exactly and
 * returned without accepting reciprocalRounding.
 *
 * Non-terminating reciprocals REQUIRE explicit precision/rounding via
 * `reciprocalRounding`. If not provided, throws.
 */
export function reciprocal(d: Decimal, reciprocalRounding?: ReciprocalRounding): Decimal {
  if (d.coefficient === 0n) {
    throw new RangeError('Cannot compute reciprocal of zero');
  }

  // We work with 1 / (coefficient / 10^scale) = 10^scale / coefficient
  // The exact result is: 10^scale / coefficient (as a fraction)
  // We need to detect termination.

  const absCoeff = absBigInt(d.coefficient);
  const sign = d.coefficient < 0n ? -1n : 1n;

  // Factor out 2s and 5s from absCoeff
  const { remaining, twos, fives } = factorTwosFives(absCoeff);

  if (remaining === 1n) {
    // Terminating: exact precision = max(twos, fives) - scale
    // Result = 10^scale / coefficient
    // = 10^scale / (sign * 2^twos * 5^fives)
    // We need the result as a Decimal at some scale S:
    // coefficient_result / 10^S = 10^scale / (sign * 2^twos * 5^fives)
    // => coefficient_result = 10^scale * 10^S / (2^twos * 5^fives)
    // For exactness: 10^S / (2^twos * 5^fives) must be integer
    // 10^S = 2^S * 5^S, so we need S >= twos and S >= fives
    // Minimal S = max(twos, fives)
    const resultScale = Math.max(Number(twos), Number(fives));
    // 10^(d.scale + resultScale) / (2^twos * 5^fives)
    const numerator = 10n ** BigInt(d.scale + resultScale);
    const coefficient = sign * (numerator / absCoeff);

    if (reciprocalRounding !== undefined) {
      // Caller provided rounding for a terminating reciprocal — that's acceptable;
      // we ignore it and return the exact result.
      return scaleDown(
        { coefficient, scale: resultScale },
        reciprocalRounding.precision,
        reciprocalRounding.mode,
      );
    }

    return { coefficient, scale: resultScale };
  }

  // Non-terminating: explicit precision/rounding required
  if (!reciprocalRounding) {
    throw new RangeError(
      `Non-terminating reciprocal requires explicit precision and rounding mode`,
    );
  }

  const { precision, mode } = reciprocalRounding;
  // Compute at precision + 1 extra digit, then round to precision
  const extraScale = precision + 1;
  const numerator = 10n ** BigInt(d.scale + extraScale);
  const rawCoeff = sign * (numerator / absCoeff);
  return scaleDown({ coefficient: rawCoeff, scale: extraScale }, precision, mode);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function absBigInt(n: bigint): bigint {
  return n < 0n ? -n : n;
}

interface FactorResult {
  remaining: bigint;
  twos: bigint;
  fives: bigint;
}

function factorTwosFives(n: bigint): FactorResult {
  let remaining = n;
  let twos = 0n;
  let fives = 0n;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    twos++;
  }
  while (remaining % 5n === 0n) {
    remaining /= 5n;
    fives++;
  }
  return { remaining, twos, fives };
}

// ---------------------------------------------------------------------------
// Validation helpers used by domain types
// ---------------------------------------------------------------------------

export function isPositiveDecimal(d: Decimal): boolean {
  return d.coefficient > 0n;
}

export function isZeroDecimal(d: Decimal): boolean {
  return d.coefficient === 0n;
}
