import { logger } from "./logger";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Turns a raw driver error into a client-safe one. The underlying detail is logged and
 * deliberately dropped from the returned message: `errorHandler` sends `AppError.message`
 * to the client verbatim, so anything left in it is published.
 */
export function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  logger.error(`[${code}] ${fallbackMessage}: ${error.message}`, { code, statusCode });
  return new AppError(statusCode, fallbackMessage, code);
}
