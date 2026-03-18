import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/appError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(
    new AppError(
      404,
      `Route ${req.method} ${req.originalUrl} was not found.`,
      "ROUTE_NOT_FOUND"
    )
  );
}
