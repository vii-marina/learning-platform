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

export function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  console.error(`[${code}] ${fallbackMessage}: ${error.message}`);
  return new AppError(statusCode, fallbackMessage, code);
}
