import { beforeEach, describe, expect, it } from "vitest";

import {
  getMetricsSnapshot,
  recordErrorCode,
  recordRequest,
  resetMetrics,
} from "../../src/lib/metrics";

beforeEach(() => {
  resetMetrics();
});

describe("request counters", () => {
  it("starts empty", () => {
    const snapshot = getMetricsSnapshot();

    expect(snapshot.requests.total).toBe(0);
    expect(snapshot.routes).toEqual([]);
    expect(snapshot.latencyMs.p95).toBeNull();
  });

  it("groups status codes by class", () => {
    recordRequest({ route: "GET /auth/me", statusCode: 200, durationMs: 5 });
    recordRequest({ route: "GET /auth/me", statusCode: 204, durationMs: 5 });
    recordRequest({ route: "GET /auth/me", statusCode: 404, durationMs: 5 });
    recordRequest({ route: "GET /auth/me", statusCode: 500, durationMs: 5 });

    const snapshot = getMetricsSnapshot();

    expect(snapshot.requests.total).toBe(4);
    expect(snapshot.requests.byStatusClass).toEqual({ "2xx": 2, "4xx": 1, "5xx": 1 });
  });

  it("counts only 5xx as a route error, because a 4xx is the caller's problem", () => {
    recordRequest({ route: "POST /authoring/courses", statusCode: 403, durationMs: 5 });
    recordRequest({ route: "POST /authoring/courses", statusCode: 500, durationMs: 5 });

    expect(getMetricsSnapshot().routes[0]).toMatchObject({ count: 2, errors: 1 });
  });

  it("keeps per-route averages and maxima", () => {
    recordRequest({ route: "GET /admin/dashboard", statusCode: 200, durationMs: 10 });
    recordRequest({ route: "GET /admin/dashboard", statusCode: 200, durationMs: 30 });

    expect(getMetricsSnapshot().routes[0]).toMatchObject({
      route: "GET /admin/dashboard",
      averageDurationMs: 20,
      maxDurationMs: 30,
    });
  });

  it("sorts routes by traffic so the busiest is first", () => {
    recordRequest({ route: "GET /quiet", statusCode: 200, durationMs: 1 });
    recordRequest({ route: "GET /busy", statusCode: 200, durationMs: 1 });
    recordRequest({ route: "GET /busy", statusCode: 200, durationMs: 1 });

    expect(getMetricsSnapshot().routes[0]?.route).toBe("GET /busy");
  });
});

// The registry is keyed by route *pattern* precisely so a million distinct ids cannot
// become a million map entries. This is the property that makes it safe to leave on.
describe("bounded memory", () => {
  it("stops adding new routes past the cap instead of growing without limit", () => {
    for (let index = 0; index < 500; index += 1) {
      recordRequest({ route: `GET /generated/${index}`, statusCode: 200, durationMs: 1 });
    }

    expect(getMetricsSnapshot().routes.length).toBe(200);
  });

  it("still counts requests for routes it stopped tracking individually", () => {
    for (let index = 0; index < 500; index += 1) {
      recordRequest({ route: `GET /generated/${index}`, statusCode: 200, durationMs: 1 });
    }

    expect(getMetricsSnapshot().requests.total).toBe(500);
  });
});

describe("latency", () => {
  it("estimates percentiles from the histogram", () => {
    for (let index = 0; index < 99; index += 1) {
      recordRequest({ route: "GET /fast", statusCode: 200, durationMs: 4 });
    }
    recordRequest({ route: "GET /slow", statusCode: 200, durationMs: 4_000 });

    const snapshot = getMetricsSnapshot();

    expect(snapshot.latencyMs.p50).toBe(5);
    expect(snapshot.latencyMs.max).toBe(4_000);
  });

  it("records requests slower than the largest bucket without losing them", () => {
    recordRequest({ route: "GET /very-slow", statusCode: 200, durationMs: 60_000 });

    const snapshot = getMetricsSnapshot();

    expect(snapshot.requests.total).toBe(1);
    expect(snapshot.latencyMs.max).toBe(60_000);
  });

  it("averages across all requests", () => {
    recordRequest({ route: "GET /a", statusCode: 200, durationMs: 10 });
    recordRequest({ route: "GET /a", statusCode: 200, durationMs: 20 });

    expect(getMetricsSnapshot().latencyMs.average).toBe(15);
  });
});

describe("error codes", () => {
  it("counts each code separately", () => {
    recordErrorCode("VALIDATION_ERROR");
    recordErrorCode("VALIDATION_ERROR");
    recordErrorCode("AUTH_TOKEN_INVALID");

    expect(getMetricsSnapshot().errorCodes).toEqual({
      AUTH_TOKEN_INVALID: 1,
      VALIDATION_ERROR: 2,
    });
  });
});
