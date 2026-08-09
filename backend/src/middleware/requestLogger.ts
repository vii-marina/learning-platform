import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";
import { recordRequest } from "../lib/metrics";
import { runWithRequestContext } from "../lib/requestContext";

/**
 * A client-supplied id is echoed rather than replaced, so a trace started in the browser
 * survives into the backend logs. It is never trusted verbatim: the value ends up in log
 * lines, so anything that could forge a line break or bloat a record is rejected and a
 * fresh id is used instead.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,64}$/;

function resolveRequestId(headerValue: unknown): string {
  if (typeof headerValue === "string" && SAFE_REQUEST_ID.test(headerValue)) {
    return headerValue;
  }

  return randomUUID();
}

/**
 * Express only knows which route matched *after* the handler runs, so the pattern is read
 * at finish time. Using the pattern (`/auth/courses/:courseId`) rather than the concrete
 * URL is what keeps the metrics registry bounded.
 */
function resolveRoutePattern(req: Request): string {
  const routePath = req.route?.path;

  if (typeof routePath === "string") {
    const combined = `${req.baseUrl}${routePath === "/" ? "" : routePath}`;
    return `${req.method} ${combined || "/"}`;
  }

  return `${req.method} unmatched`;
}

/** Health checks run constantly and would drown everything else at info level. */
function isNoiseRoute(path: string): boolean {
  return path === "/health" || path === "/health/ready";
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.header("x-request-id"));
  const startedAt = process.hrtime.bigint();

  // Echoed so the caller can quote it in a bug report, and so the frontend can attach it
  // to its own error records.
  res.setHeader("x-request-id", requestId);

  runWithRequestContext({ requestId, method: req.method, path: req.path }, () => {
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const rounded = Math.round(durationMs * 100) / 100;

      recordRequest({
        route: resolveRoutePattern(req),
        statusCode: res.statusCode,
        durationMs: rounded,
      });

      const context = {
        status: res.statusCode,
        durationMs: rounded,
      };

      if (res.statusCode >= 500) {
        logger.error("Request failed", context);
      } else if (res.statusCode >= 400) {
        logger.warn("Request rejected", context);
      } else if (isNoiseRoute(req.path)) {
        logger.debug("Request completed", context);
      } else {
        logger.info("Request completed", context);
      }
    });

    next();
  });
}
