import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

/**
 * Route-level tests: the real Express app, the real middleware chain, mocked data layer.
 *
 * Unit tests prove a guard function returns 403 when asked. These prove the guard is
 * actually *mounted* on the route — which is a different claim, and the one that matters.
 * A guard can be perfectly correct and simply not wired up; only a request through the real
 * app catches that.
 *
 * Supabase and OpenAI are mocked at the module boundary, so nothing here reaches a network.
 */

const mocks = vi.hoisted(() => {
  const state = {
    authError: null as { message: string; status?: number; name?: string } | null,
    authUser: null as { id: string; email: string | null } | null,
    role: "student" as string,
    isAdmin: false,
    isSuperAdmin: false,
  };

  return {
    state,
    getUser: vi.fn(async () => ({ data: { user: state.authUser }, error: state.authError })),
    from: vi.fn(() => ({
      select: () => ({ limit: async () => ({ data: [], error: null }) }),
    })),
  };
});

vi.mock("../../src/lib/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

vi.mock("../../src/services/userService", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../../src/services/userService");

  return {
    ...actual,
    getRequestAuthContext: vi.fn(async (userId: string, email: string) => ({
      userId,
      email,
      fullName: null,
      role: mocks.state.role,
      isAdmin: mocks.state.isAdmin,
      isSuperAdmin: mocks.state.isSuperAdmin,
      createdAt: null,
      profileExists: true,
    })),
  };
});

const { createApp } = await import("../../src/app");

const app = createApp();

/** Signs in as a role for the next request. The token itself is never validated locally. */
function signInAs(role: string, options: { isAdmin?: boolean; isSuperAdmin?: boolean } = {}) {
  mocks.state.authUser = { id: "user-1", email: "user@example.com" };
  mocks.state.authError = null;
  mocks.state.role = role;
  mocks.state.isAdmin = options.isAdmin ?? false;
  mocks.state.isSuperAdmin = options.isSuperAdmin ?? false;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.state.authUser = null;
  mocks.state.authError = null;
  mocks.state.role = "student";
  mocks.state.isAdmin = false;
  mocks.state.isSuperAdmin = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("health routes", () => {
  it("serves liveness without authentication", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("serves readiness without authentication", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.dependency).toBe("supabase");
  });

  // The metrics route describes traffic volume and the route table; it must not be public.
  it("rejects metrics without a token", async () => {
    const response = await request(app).get("/health/metrics");

    expect(response.status).toBe(401);
  });

  it("rejects metrics for a signed-in non-admin", async () => {
    signInAs("teacher");

    const response = await request(app)
      .get("/health/metrics")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_REQUIRED");
  });

  it("serves metrics to an admin", async () => {
    signInAs("admin", { isAdmin: true });

    const response = await request(app)
      .get("/health/metrics")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("requests");
    expect(response.body).toHaveProperty("latencyMs");
  });
});

// One case per router. If a router is ever mounted without `requireAuth`, one of these fails.
describe("authentication is mounted on every protected router", () => {
  const protectedRoutes = [
    { method: "get", path: "/auth/me" },
    { method: "get", path: "/auth/student/dashboard/courses" },
    { method: "post", path: "/authoring/courses" },
    { method: "get", path: "/admin/dashboard/overview" },
    { method: "get", path: "/api/modules/module-1/exercises" },
    { method: "post", path: "/api/ai/generate-test-questions" },
  ] as const;

  for (const { method, path } of protectedRoutes) {
    it(`rejects ${method.toUpperCase()} ${path} without a token`, async () => {
      const agent = request(app);
      const response = await (method === "get" ? agent.get(path) : agent.post(path));

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("AUTH_TOKEN_MISSING");
    });
  }

  it("rejects a malformed Authorization header", async () => {
    const response = await request(app).get("/auth/me").set("Authorization", "token-without-scheme");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_TOKEN_MISSING");
  });

  it("rejects a token Supabase refuses", async () => {
    mocks.state.authError = { message: "invalid JWT", status: 401 };

    const response = await request(app).get("/auth/me").set("Authorization", "Bearer bad");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTH_TOKEN_INVALID");
  });

  // A Supabase outage must not read as "your session expired" — the dashboards turn 401 into
  // a forced logout, so an upstream blip would sign every user out at once.
  it("reports an upstream auth outage as 503, not 401", async () => {
    mocks.state.authError = { message: "fetch failed", name: "AuthRetryableFetchError" };

    const response = await request(app).get("/auth/me").set("Authorization", "Bearer any");

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("AUTH_UPSTREAM_UNAVAILABLE");
  });
});

describe("role guards are mounted", () => {
  it("keeps a student out of the admin dashboard", async () => {
    signInAs("student");

    const response = await request(app)
      .get("/admin/dashboard/overview")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_REQUIRED");
  });

  it("keeps a teacher out of the admin dashboard", async () => {
    signInAs("teacher");

    const response = await request(app)
      .get("/admin/dashboard/overview")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(403);
  });

  it("keeps a non-super-admin out of the role-granting endpoint", async () => {
    signInAs("admin", { isAdmin: true });

    const response = await request(app)
      .patch("/admin/users/user-2")
      .set("Authorization", "Bearer token")
      .send({ role: "teacher" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("SUPER_ADMIN_REQUIRED");
  });

  it("keeps a student out of AI generation", async () => {
    signInAs("student");

    const response = await request(app)
      .post("/api/ai/generate-test-questions")
      .set("Authorization", "Bearer token")
      .send({ moduleId: "module-1" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("TEACHER_OR_ADMIN_REQUIRED");
  });
});

describe("request handling", () => {
  it("answers an unknown route with 404 and a code", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.code).toBeDefined();
  });

  it("rejects a malformed JSON body", async () => {
    const response = await request(app)
      .post("/authoring/courses")
      .set("Authorization", "Bearer token")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_JSON");
  });

  it("reports schema violations as a validation error", async () => {
    signInAs("teacher");

    const response = await request(app)
      .post("/authoring/courses")
      .set("Authorization", "Bearer token")
      .send({ title: 123 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});

// The id is what connects a user's bug report to a log line, so it has to be on the
// response — not merely inside the server's own logs.
describe("request correlation", () => {
  it("returns a request id on every response", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("echoes a caller-supplied id so a trace survives the boundary", async () => {
    const response = await request(app).get("/health").set("x-request-id", "trace-abc");

    expect(response.headers["x-request-id"]).toBe("trace-abc");
  });

  it("refuses an id that could forge a log line", async () => {
    const response = await request(app)
      .get("/health")
      .set("x-request-id", "abc def");

    expect(response.headers["x-request-id"]).not.toBe("abc def");
  });

  it("includes the request id in an error body", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });
});

describe("CORS", () => {
  it("rejects an origin that is not allowed", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://attacker.example");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CORS_ORIGIN_NOT_ALLOWED");
  });

  it("allows the configured origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://127.0.0.1:5173");

    expect(response.status).toBe(200);
  });

  // Server-to-server callers and same-origin requests send no Origin at all.
  it("allows a request with no origin", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });
});
