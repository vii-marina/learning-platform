import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { getMetricsSnapshot, resetMetrics } from "../../src/lib/metrics";
import { getRequestContext } from "../../src/lib/requestContext";
import { requestLogger } from "../../src/middleware/requestLogger";

type FakeResponse = EventEmitter & {
  statusCode: number;
  setHeader: ReturnType<typeof vi.fn>;
};

function createResponse(statusCode = 200): FakeResponse {
  const res = new EventEmitter() as FakeResponse;
  res.statusCode = statusCode;
  res.setHeader = vi.fn();
  return res;
}

function createRequest(overrides: Partial<Request> & { headers?: Record<string, string> } = {}) {
  const headers = overrides.headers ?? {};

  return {
    method: "GET",
    path: "/auth/me",
    baseUrl: "/auth",
    route: { path: "/me" },
    header: (name: string) => headers[name.toLowerCase()],
    ...overrides,
  } as unknown as Request;
}

/** Runs the middleware and captures the context visible to downstream handlers. */
function run(req: Request, res: FakeResponse) {
  let captured: ReturnType<typeof getRequestContext>;
  const next = vi.fn(() => {
    captured = getRequestContext();
  });

  requestLogger(req, res as unknown as Response, next as unknown as NextFunction);

  return { next, context: captured! };
}

beforeEach(() => {
  resetMetrics();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("request id", () => {
  it("generates one when the caller sends none", () => {
    const { context } = run(createRequest(), createResponse());

    expect(context?.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("echoes a well-formed caller id so a trace survives across the boundary", () => {
    const { context } = run(
      createRequest({ headers: { "x-request-id": "trace-123" } }),
      createResponse()
    );

    expect(context?.requestId).toBe("trace-123");
  });

  it("always exposes the id on the response so it can be quoted in a bug report", () => {
    const res = createResponse();
    run(createRequest({ headers: { "x-request-id": "trace-123" } }), res);

    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", "trace-123");
  });

  // The value is written into log lines, so a caller must not be able to forge one.
  it("rejects an id containing a newline and generates a fresh one", () => {
    const { context } = run(
      createRequest({ headers: { "x-request-id": "abc\ninjected log line" } }),
      createResponse()
    );

    expect(context?.requestId).not.toContain("injected");
    expect(context?.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects an over-long id", () => {
    const { context } = run(
      createRequest({ headers: { "x-request-id": "x".repeat(500) } }),
      createResponse()
    );

    expect(context?.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("context propagation", () => {
  it("exposes the method and path to downstream code", () => {
    const { context } = run(createRequest(), createResponse());

    expect(context).toMatchObject({ method: "GET", path: "/auth/me" });
  });

  it("calls next exactly once", () => {
    const { next } = run(createRequest(), createResponse());

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("metrics recording", () => {
  it("records the route pattern rather than the concrete URL", () => {
    const res = createResponse(200);
    run(
      createRequest({ baseUrl: "/auth", route: { path: "/courses/:courseId" } as Request["route"] }),
      res
    );
    res.emit("finish");

    expect(getMetricsSnapshot().routes[0]?.route).toBe("GET /auth/courses/:courseId");
  });

  it("labels a request that matched no route", () => {
    const res = createResponse(404);
    run(createRequest({ route: undefined, baseUrl: "" }), res);
    res.emit("finish");

    expect(getMetricsSnapshot().routes[0]?.route).toBe("GET unmatched");
  });

  it("records nothing until the response finishes", () => {
    run(createRequest(), createResponse());

    expect(getMetricsSnapshot().requests.total).toBe(0);
  });

  it("records the status class on finish", () => {
    const res = createResponse(500);
    run(createRequest(), res);
    res.emit("finish");

    expect(getMetricsSnapshot().requests.byStatusClass).toEqual({ "5xx": 1 });
  });
});

describe("log level by outcome", () => {
  it("logs a server error at error level", () => {
    const res = createResponse(503);
    run(createRequest(), res);
    res.emit("finish");

    expect(console.error).toHaveBeenCalled();
  });

  it("logs a client error at warn level", () => {
    const res = createResponse(403);
    run(createRequest(), res);
    res.emit("finish");

    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a success at info level", () => {
    const res = createResponse(200);
    run(createRequest(), res);
    res.emit("finish");

    expect(console.log).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
