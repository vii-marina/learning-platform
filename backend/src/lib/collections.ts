/**
 * Small collection helpers shared by the dashboard services.
 *
 * Each of these existed as a byte-identical private copy in three or four services. They
 * are pure and have no Supabase dependency, so one shared copy is both testable and one
 * fewer place for the four versions to drift apart.
 */

/**
 * Splits ids into batches for `in (...)` filters.
 *
 * PostgREST puts the filter in the query string, so an unbounded `in` list eventually
 * exceeds the URL length the server accepts. 50 is the size every caller already used.
 */
export function chunkValues<TValue>(values: TValue[], size = 50): TValue[][] {
  const chunks: TValue[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

/** Counts items per key — used for the "N lessons / N tests" figures on course cards. */
export function groupCounts<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string
): Map<string, number> {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

/**
 * Groups into a Map. Items whose key is null, undefined or empty are dropped rather than
 * collected under a blank key — the callers group by a foreign key, and a row without one
 * belongs to nothing.
 */
export function groupByToMap<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string | null | undefined
): Map<string, TItem[]> {
  const groups = new Map<string, TItem[]>();

  for (const item of items) {
    const key = getKey(item);

    if (!key) {
      continue;
    }

    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return groups;
}

/**
 * Groups into a plain object, for the `*_by_module` / `*_by_lesson` shapes that go
 * straight into a JSON response.
 */
export function groupByToRecord<TItem>(
  items: TItem[],
  getKey: (item: TItem) => string
): Record<string, TItem[]> {
  const groups: Record<string, TItem[]> = {};

  for (const item of items) {
    const key = getKey(item);
    const bucket = groups[key] ?? [];
    bucket.push(item);
    groups[key] = bucket;
  }

  return groups;
}
