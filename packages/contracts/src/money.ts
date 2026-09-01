/**
 * DTO shape for Currency.
 * Transfer-only: no behaviour, no validation logic.
 */
export interface CurrencyDto {
  /** Uppercase ISO-4217 three-letter code, e.g. "USD". */
  readonly code: string;
  /** Non-negative safe-integer number of decimal places, e.g. 2 for USD. */
  readonly precision: number;
}

/**
 * DTO shape for Money.
 * Amount is a string representation of the exact decimal value.
 * Transfer-only: no behaviour, no validation logic.
 */
export interface MoneyDto {
  readonly currency: CurrencyDto;
  /** Exact decimal string, e.g. "10.00". Never floating-point. */
  readonly amount: string;
}
