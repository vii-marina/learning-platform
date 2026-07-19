// Coalesces concurrent identical reads into one shared promise (collapses
// StrictMode double-fetches and simultaneous callers). Dropped once it settles,
// so there's no caching/staleness — a later refetch still hits the network.

const inFlightRequests = new Map<string, Promise<unknown>>();

export function dedupeRequest<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;

  if (existing) {
    return existing;
  }

  const tracked = loader().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, tracked);

  return tracked;
}
