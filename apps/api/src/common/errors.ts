import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'MISSING_FX_RATE'
  | 'ACCOUNT_ARCHIVED'
  | 'CURRENCY_MISMATCH'
  | 'IDEMPOTENCY_CONFLICT';

export class AppError extends HttpException {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message }, status);
    this.code = code;
  }
}

export function validation(message: string): never {
  throw new AppError('VALIDATION_ERROR', message, HttpStatus.UNPROCESSABLE_ENTITY);
}
export function notFound(message = 'Resource not found'): never {
  throw new AppError('NOT_FOUND', message, HttpStatus.NOT_FOUND);
}
