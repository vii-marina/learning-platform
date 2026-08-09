const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Guards a value before it is used in a uuid column filter.
 *
 * Some rows carry a legacy non-uuid identifier, and passing one to PostgREST fails the whole
 * query with `22P02` rather than simply matching nothing. Filtering ids through this first
 * means one bad row cannot take out an entire dashboard.
 */
export function isUuidValue(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
