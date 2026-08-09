import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLogLevel,
  isLevelEnabled,
  logger,
  redactContext,
  setErrorReporter,
  setLogLevel,
  type LogRecord,
} from "../../src/lib/logger";
import { runWithRequestContext } from "../../src/lib/requestContext";

const originalLevel = getLogLevel();

beforeEach(() => {
  setLogLevel("debug");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  setLogLevel(originalLevel);
  setErrorReporter(null);
  vi.restoreAllMocks();
});

function lastLine(spy: ReturnType<typeof vi.spyOn>): string {
  const calls = spy.mock.calls;
  return String(calls[calls.length - 1]?.[0] ?? "");
}

describe("log levels", () => {
  it("suppresses records below the active level", () => {
    setLogLevel("warn");

    logger.debug("debug line");
    logger.info("info line");

    expect(console.log).not.toHaveBeenCalled();
  });

  it("still emits records at or above the active level", () => {
    setLogLevel("warn");

    logger.warn("warn line");
    logger.error("error line");

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("reports whether a level would be emitted", () => {
    setLogLevel("info");

    expect(isLevelEnabled("debug")).toBe(false);
    expect(isLevelEnabled("info")).toBe(true);
    expect(isLevelEnabled("error")).toBe(true);
  });

  it("routes each level to the matching console channel", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

// A logger is the easiest accidental route for a secret to reach a third-party log
// service, so redaction is pinned rather than assumed.
describe("redaction", () => {
  it("redacts sensitive keys regardless of casing or separator", () => {
    const redacted = redactContext({
      password: "hunter2",
      API_KEY: "sk-live-123",
      "api-key": "sk-live-456",
      apiKey: "sk-live-789",
      accessToken: "token-value",
      authorization: "Bearer abc",
      serviceRoleKey: "service-role-secret",
      refreshToken: "refresh-value",
    });

    for (const value of Object.values(redacted)) {
      expect(value).toBe("[redacted]");
    }
  });

  it("redacts nested secrets, not just top-level ones", () => {
    const redacted = redactContext({
      request: { headers: { authorization: "Bearer abc" }, url: "/auth/me" },
    }) as { request: { headers: { authorization: string }; url: string } };

    expect(redacted.request.headers.authorization).toBe("[redacted]");
    expect(redacted.request.url).toBe("/auth/me");
  });

  it("never writes a redacted value to the output", () => {
    logger.error("Upstream call failed", {
      supabaseServiceRoleKey: "super-secret-value",
      openaiApiKey: "sk-should-never-appear",
    });

    const line = lastLine(vi.mocked(console.error));

    expect(line).not.toContain("super-secret-value");
    expect(line).not.toContain("sk-should-never-appear");
    expect(line).toContain("[redacted]");
  });

  it("keeps non-sensitive values intact", () => {
    const redacted = redactContext({ courseId: "course-1", count: 3, ok: true });

    expect(redacted).toEqual({ courseId: "course-1", count: 3, ok: true });
  });

  it("survives circular references instead of throwing", () => {
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;

    expect(() => redactContext(circular)).not.toThrow();
    expect(redactContext(circular)).toMatchObject({ name: "root", self: "[circular]" });
  });

  it("truncates very long strings so one record cannot flood the log", () => {
    const redacted = redactContext({ blob: "x".repeat(5_000) }) as { blob: string };

    expect(redacted.blob.length).toBeLessThan(5_000);
    expect(redacted.blob).toContain("more chars");
  });

  it("caps array length", () => {
    const redacted = redactContext({ items: Array.from({ length: 50 }, (_, i) => i) }) as {
      items: unknown[];
    };

    expect(redacted.items.length).toBe(21);
    expect(redacted.items[20]).toBe("[30 more items]");
  });

  it("stops descending past the depth limit rather than recursing forever", () => {
    const deep = { a: { b: { c: { d: { e: "too deep" } } } } };

    expect(JSON.stringify(redactContext(deep))).toContain("[max depth]");
    expect(JSON.stringify(redactContext(deep))).not.toContain("too deep");
  });

  it("serializes an Error with its name, message and stack", () => {
    const redacted = redactContext({ error: new Error("boom") }) as {
      error: { name: string; message: string; stack: string };
    };

    expect(redacted.error.name).toBe("Error");
    expect(redacted.error.message).toBe("boom");
    expect(redacted.error.stack).toContain("boom");
  });
});

describe("request context enrichment", () => {
  it("attaches the request id to every line logged during a request", () => {
    runWithRequestContext(
      { requestId: "req-abc", method: "GET", path: "/auth/me" },
      () => logger.info("inside a request")
    );

    const line = lastLine(vi.mocked(console.log));

    expect(line).toContain("req-abc");
    expect(line).toContain("/auth/me");
  });

  it("omits request fields when there is no request", () => {
    logger.info("outside a request");

    expect(lastLine(vi.mocked(console.log))).not.toContain("requestId");
  });

  it("does not let caller context overwrite the level or message", () => {
    logger.info("real message", { level: "debug", message: "fake message" });

    const line = lastLine(vi.mocked(console.log));

    expect(line).toContain("INFO");
    expect(line).toContain("real message");
  });
});

describe("child loggers", () => {
  it("merges bound context into every record", () => {
    const scoped = logger.child({ component: "courseAuthoring" });

    scoped.info("saved", { courseId: "course-9" });

    const line = lastLine(vi.mocked(console.log));

    expect(line).toContain("courseAuthoring");
    expect(line).toContain("course-9");
  });

  it("lets a call override its bound context", () => {
    const scoped = logger.child({ stage: "start" });

    scoped.info("done", { stage: "finish" });

    expect(lastLine(vi.mocked(console.log))).toContain("finish");
  });
});

// The seam that lets Sentry (or anything else) be attached later without touching
// call sites.
describe("error reporter", () => {
  it("receives error records only", () => {
    const reported: LogRecord[] = [];
    setErrorReporter((record) => reported.push(record));

    logger.info("fine");
    logger.warn("suspicious");
    logger.error("broken");

    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toBe("broken");
  });

  it("does not let a failing reporter break the request", () => {
    setErrorReporter(() => {
      throw new Error("reporter is down");
    });

    expect(() => logger.error("still logged")).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("reports records that have already been redacted", () => {
    const reported: LogRecord[] = [];
    setErrorReporter((record) => reported.push(record));

    logger.error("failed", { password: "hunter2" });

    expect(reported[0]?.password).toBe("[redacted]");
  });
});
