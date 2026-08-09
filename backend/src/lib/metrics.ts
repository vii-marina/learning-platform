/**
 * In-process request metrics.
 *
 * Deliberately dependency-free and bounded. The instance is single and small, so a
 * full metrics stack would cost more than it returns; what is actually missing when
 * something goes wrong is "how often, how slow, and which route", and that is what
 * this answers.
 *
 * Two properties keep it safe to leave on:
 *  - **Bounded memory.** Routes are keyed by their Express *pattern* (`/auth/courses/:id`),
 *    never the concrete URL, so a million distinct ids create one key rather than a
 *    million. Unmatched requests collapse into a single bucket.
 *  - **Bounded work.** Latency lives in fixed histogram buckets, so recording is O(1)
 *    and nothing accumulates per request.
 *
 * Counters reset when the process restarts, which on a single instance is exactly the
 * window worth looking at.
 */

const LATENCY_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000];

/** Guards against a pathological route table; far above the ~71 real endpoints. */
const MAX_TRACKED_ROUTES = 200;

type RouteStats = {
  count: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

type Registry = {
  startedAt: number;
  total: number;
  byStatusClass: Map<string, number>;
  byRoute: Map<string, RouteStats>;
  byErrorCode: Map<string, number>;
  latencyBucketCounts: number[];
  latencyOverflowCount: number;
  latencyTotalMs: number;
  latencyMaxMs: number;
};

function createRegistry(): Registry {
  return {
    startedAt: Date.now(),
    total: 0,
    byStatusClass: new Map(),
    byRoute: new Map(),
    byErrorCode: new Map(),
    latencyBucketCounts: new Array<number>(LATENCY_BUCKETS_MS.length).fill(0),
    latencyOverflowCount: 0,
    latencyTotalMs: 0,
    latencyMaxMs: 0,
  };
}

let registry = createRegistry();

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordLatency(durationMs: number): void {
  registry.latencyTotalMs += durationMs;

  if (durationMs > registry.latencyMaxMs) {
    registry.latencyMaxMs = durationMs;
  }

  const bucketIndex = LATENCY_BUCKETS_MS.findIndex((boundary) => durationMs <= boundary);

  if (bucketIndex === -1) {
    registry.latencyOverflowCount += 1;
    return;
  }

  registry.latencyBucketCounts[bucketIndex] += 1;
}

export function recordRequest(input: {
  route: string;
  statusCode: number;
  durationMs: number;
}): void {
  registry.total += 1;

  const statusClass = `${Math.floor(input.statusCode / 100)}xx`;
  increment(registry.byStatusClass, statusClass);

  recordLatency(input.durationMs);

  const existing = registry.byRoute.get(input.route);

  if (existing) {
    existing.count += 1;
    existing.totalDurationMs += input.durationMs;
    existing.errors += input.statusCode >= 500 ? 1 : 0;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, input.durationMs);
    return;
  }

  if (registry.byRoute.size >= MAX_TRACKED_ROUTES) {
    return;
  }

  registry.byRoute.set(input.route, {
    count: 1,
    errors: input.statusCode >= 500 ? 1 : 0,
    totalDurationMs: input.durationMs,
    maxDurationMs: input.durationMs,
  });
}

export function recordErrorCode(code: string): void {
  increment(registry.byErrorCode, code);
}

/**
 * Approximates a percentile from the histogram. The value returned is the upper bound
 * of the bucket the percentile falls in, so it reads as "at least 95% of requests
 * finished within Xms" rather than an exact figure.
 */
function estimatePercentile(percentile: number): number | null {
  const counted =
    registry.latencyBucketCounts.reduce((sum, count) => sum + count, 0) +
    registry.latencyOverflowCount;

  if (counted === 0) {
    return null;
  }

  const target = counted * percentile;
  let cumulative = 0;

  for (let index = 0; index < LATENCY_BUCKETS_MS.length; index += 1) {
    cumulative += registry.latencyBucketCounts[index];

    if (cumulative >= target) {
      return LATENCY_BUCKETS_MS[index];
    }
  }

  return registry.latencyMaxMs;
}

function toSortedObject<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export type MetricsSnapshot = {
  startedAt: string;
  uptimeSeconds: number;
  requests: {
    total: number;
    byStatusClass: Record<string, number>;
  };
  latencyMs: {
    average: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    max: number;
  };
  errorCodes: Record<string, number>;
  routes: Array<{
    route: string;
    count: number;
    errors: number;
    averageDurationMs: number;
    maxDurationMs: number;
  }>;
  memoryMb: {
    heapUsed: number;
    rss: number;
  };
};

export function getMetricsSnapshot(): MetricsSnapshot {
  const memory = process.memoryUsage();

  return {
    startedAt: new Date(registry.startedAt).toISOString(),
    uptimeSeconds: Math.round((Date.now() - registry.startedAt) / 1_000),
    requests: {
      total: registry.total,
      byStatusClass: toSortedObject(registry.byStatusClass),
    },
    latencyMs: {
      average: registry.total > 0 ? Math.round(registry.latencyTotalMs / registry.total) : null,
      p50: estimatePercentile(0.5),
      p95: estimatePercentile(0.95),
      p99: estimatePercentile(0.99),
      max: registry.latencyMaxMs,
    },
    errorCodes: toSortedObject(registry.byErrorCode),
    routes: [...registry.byRoute.entries()]
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        errors: stats.errors,
        averageDurationMs: Math.round(stats.totalDurationMs / stats.count),
        maxDurationMs: stats.maxDurationMs,
      }))
      .sort((a, b) => b.count - a.count),
    memoryMb: {
      heapUsed: Math.round(memory.heapUsed / 1_048_576),
      rss: Math.round(memory.rss / 1_048_576),
    },
  };
}

/** Test seam — production never calls this. */
export function resetMetrics(): void {
  registry = createRegistry();
}
