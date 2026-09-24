import { monthBounds } from '@lukitas/domain/planning';
import { validation } from '../common/errors.js';

export const validatedMonthBounds = (month: string, timezone: string) => {
  try {
    return monthBounds(month, timezone);
  } catch (error) {
    if (error instanceof RangeError) validation(error.message);
    throw error;
  }
};
