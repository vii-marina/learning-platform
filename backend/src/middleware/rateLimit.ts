import type { NextFunction, Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AppError } from "../lib/appError";

// AI routes run behind `requireAuth`, so `req.auth` is always set there — key the
// AI limits on the user id so the cap follows the account across IPs/devices.
// The IP fallback (via `ipKeyGenerator`, IPv6-safe) only matters if a limiter is
// ever mounted before auth.
function userKey(req: Request): string {
  return req.auth?.userId
    ? `user:${req.auth.userId}`
    : `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

function rejectWith(message: string, code: string) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(429, message, code));
  };
}

// Per-user burst limit on AI generation — the main cost/abuse guard (R: AI rate
// limiting). Blocks a teacher/admin from firing many expensive OpenAI calls in a
// tight loop.
export const aiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  keyGenerator: userKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rejectWith(
    "AI generation rate limit reached. Please wait a minute and try again.",
    "AI_RATE_LIMITED"
  ),
});

// Per-user daily cap on AI generation — a rough monthly-cost backstop. In-memory
// store: resets on restart and is per-instance (fine for the single-instance MVP;
// move to a shared store, e.g. Redis, before scaling to multiple instances).
export const aiDailyRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 150,
  keyGenerator: userKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rejectWith(
    "Daily AI generation limit reached. Please try again tomorrow.",
    "AI_DAILY_LIMIT_REACHED"
  ),
});

// Coarse per-IP flood backstop for the whole API. Tuned high so it never
// interferes with normal use (including the course-builder's N+1 authoring
// writes) — it only trips on runaway loops / abuse.
export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rejectWith("Too many requests. Please slow down.", "RATE_LIMITED"),
});
