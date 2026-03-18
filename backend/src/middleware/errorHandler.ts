import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/appError";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  ) {
    res.status(400).json({
      message: "Invalid JSON payload.",
      code: "INVALID_JSON",
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Request validation failed.",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error.",
    code: "INTERNAL_SERVER_ERROR",
  });
};
