import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/appError";
import { logger } from "../lib/logger";
import { recordErrorCode } from "../lib/metrics";
import { getRequestContext } from "../lib/requestContext";

/**
 * Attached to every error response so a user can quote one string in a bug report and
 * the matching log line can be found directly.
 */
function currentRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = currentRequestId();

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  ) {
    recordErrorCode("INVALID_JSON");
    logger.warn("Rejected a malformed JSON body", { code: "INVALID_JSON" });
    res.status(400).json({
      message: "Invalid JSON payload.",
      code: "INVALID_JSON",
      requestId,
    });
    return;
  }

  if (error instanceof ZodError) {
    recordErrorCode("VALIDATION_ERROR");
    logger.warn("Request validation failed", {
      code: "VALIDATION_ERROR",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    });
    res.status(400).json({
      message: "Request validation failed.",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
      requestId,
    });
    return;
  }

  if (error instanceof AppError) {
    recordErrorCode(error.code);

    // A 4xx is the API working as designed — the caller asked for something they may not
    // have. Only a 5xx means this process is at fault, so only that gets error level.
    if (error.statusCode >= 500) {
      logger.error("Request failed with a server error", {
        code: error.code,
        statusCode: error.statusCode,
        error,
      });
    } else {
      logger.warn("Request rejected", {
        code: error.code,
        statusCode: error.statusCode,
      });
    }

    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details,
      requestId,
    });
    return;
  }

  recordErrorCode("INTERNAL_SERVER_ERROR");
  logger.error("Unhandled error reached the error handler", {
    code: "INTERNAL_SERVER_ERROR",
    error,
  });

  res.status(500).json({
    message: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR",
    requestId,
  });
};
