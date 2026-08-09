import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../src/lib/appError";

const mocks = vi.hoisted(() => {
  const state = {
    error: null as ({ message: string; status?: number; name?: string } | null),
    user: null as { id: string; email: string | null; user_metadata?: unknown } | null,
  };

  const getUser = vi.fn(async () => ({ data: { user: state.user }, error: state.error }));

  return { state, getUser };
});

vi.mock("../../src/lib/supabase", () => ({
  supabaseAdmin: { auth: { getUser: mocks.getUser } },
}));

vi.mock("../../src/services/userService", () => ({
  getRequestAuthContext: vi.fn(async (userId: string, email: string) => ({
    userId,
    email,
    fullName: null,
    role: "student",
    isAdmin: false,
    isSuperAdmin: false,
    createdAt: null,
    profileExists: true,
  })),
}));

const { requireAuth } = await import("../../src/middleware/auth");

function runMiddleware(authorization: string | undefined) {
  const req = { header: (name: string) => (name === "Authorization" ? authorization : undefined) };
  const next = vi.fn();

  return requireAuth(req as unknown as Request, {} as Response, next as unknown as NextFunction).then(
    () => ({ req: req as unknown as Request & { auth?: unknown }, next })
  );
}

function errorPassedToNext(next: ReturnType<typeof vi.fn>) {
  return next.mock.calls[0]?.[0] as AppError | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.error = null;
  mocks.state.user = null;
});

// auth-js returns transport failures through `error` instead of throwing. Treating those the same
// as a rejected token answered every request with 401, and the dashboards turn a 401 into a forced
// redirect to /login — so a Supabase blip or a bad SUPABASE_URL looked like every user's session
// expiring at once, with nothing written to the logs.
describe("requireAuth upstream failures", () => {
  it("reports a retryable transport failure as 503, not 401", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: "fetch failed", name: "AuthRetryableFetchError" };

    const { next } = await runMiddleware("Bearer some-token");
    const error = errorPassedToNext(next);

    expect(error).toBeInstanceOf(AppError);
    expect(error?.statusCode).toBe(503);
    expect(error?.code).toBe("AUTH_UPSTREAM_UNAVAILABLE");
  });

  it("reports an error with no status as 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: "getaddrinfo ENOTFOUND supabase.co" };

    const { next } = await runMiddleware("Bearer some-token");

    expect(errorPassedToNext(next)?.statusCode).toBe(503);
  });

  it("reports a GoTrue 5xx as 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: "internal server error", status: 500 };

    const { next } = await runMiddleware("Bearer some-token");

    expect(errorPassedToNext(next)?.statusCode).toBe(503);
  });

  it("logs the upstream detail so the outage is diagnosable", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: "fetch failed", name: "AuthRetryableFetchError" };

    await runMiddleware("Bearer some-token");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("AUTH_UPSTREAM_UNAVAILABLE");
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("fetch failed");
  });
});

describe("requireAuth token handling", () => {
  it("still rejects a token GoTrue actually refused with 401", async () => {
    mocks.state.error = { message: "invalid JWT", status: 401 };

    const { next } = await runMiddleware("Bearer bad-token");
    const error = errorPassedToNext(next);

    expect(error?.statusCode).toBe(401);
    expect(error?.code).toBe("AUTH_TOKEN_INVALID");
  });

  it("rejects a 403 from GoTrue as a token problem", async () => {
    mocks.state.error = { message: "forbidden", status: 403 };

    const { next } = await runMiddleware("Bearer bad-token");

    expect(errorPassedToNext(next)?.code).toBe("AUTH_TOKEN_INVALID");
  });

  it("rejects a missing bearer token before calling Supabase", async () => {
    const { next } = await runMiddleware(undefined);

    expect(errorPassedToNext(next)?.code).toBe("AUTH_TOKEN_MISSING");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("treats an empty user with no error as an invalid token", async () => {
    mocks.state.error = null;
    mocks.state.user = null;

    const { next } = await runMiddleware("Bearer some-token");

    expect(errorPassedToNext(next)?.code).toBe("AUTH_TOKEN_INVALID");
  });

  it("attaches the auth context on success", async () => {
    mocks.state.user = { id: "user-1", email: "user@example.com" };

    const { req, next } = await runMiddleware("Bearer good-token");

    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toMatchObject({ userId: "user-1", email: "user@example.com" });
  });

  it("rejects an authenticated user with no email", async () => {
    mocks.state.user = { id: "user-1", email: null };

    const { next } = await runMiddleware("Bearer good-token");

    expect(errorPassedToNext(next)?.code).toBe("AUTH_EMAIL_MISSING");
  });
});
