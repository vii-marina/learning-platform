import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The snapshot write is best-effort by design (F1): the admin's landing save must
// still succeed when the migration has not been run, because the landing falls
// back to GET /public/landing-preview.
const mocks = vi.hoisted(() => {
  const state = { error: null as { code?: string; message: string } | null };
  const upsert = vi.fn(async () => ({ error: state.error }));

  const supabaseAdmin = {
    from: vi.fn(() => ({ upsert })),
  };

  return { state, upsert, supabaseAdmin };
});

vi.mock("../../src/lib/supabase", () => ({ supabaseAdmin: mocks.supabaseAdmin }));

const { isMissingTableError, saveLandingPreviewSnapshot, LANDING_PREVIEW_SNAPSHOT_ID } =
  await import("../../src/services/landingPageSettingsService");

describe("isMissingTableError", () => {
  it("recognizes the PostgREST and Postgres missing-table codes", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "" }, "any_table")).toBe(true);
    expect(isMissingTableError({ code: "42P01", message: "" }, "any_table")).toBe(true);
  });

  it("recognizes the message form for the named table", () => {
    expect(
      isMissingTableError(
        { message: "Could not find the table 'public.landing_preview_snapshot'" },
        "landing_preview_snapshot"
      )
    ).toBe(true);
    expect(
      isMissingTableError(
        { message: 'relation "landing_preview_snapshot" does not exist' },
        "landing_preview_snapshot"
      )
    ).toBe(true);
  });

  it("does not match an unrelated error", () => {
    expect(
      isMissingTableError({ code: "23505", message: "duplicate key value" }, "landing_preview_snapshot")
    ).toBe(false);
  });

  it("does not match a missing-table message for a different table", () => {
    expect(
      isMissingTableError(
        { message: 'relation "some_other_table" does not exist' },
        "landing_preview_snapshot"
      )
    ).toBe(false);
  });
});

describe("saveLandingPreviewSnapshot", () => {
  const source = { courseId: "course-1", lessonId: "lesson-1" };

  beforeEach(() => {
    mocks.state.error = null;
    mocks.upsert.mockClear();
    mocks.supabaseAdmin.from.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores the payload in the single snapshot row", async () => {
    const payload = { course: { id: "course-1" } };

    await expect(saveLandingPreviewSnapshot(payload, source)).resolves.toBe(true);

    expect(mocks.supabaseAdmin.from).toHaveBeenCalledWith("landing_preview_snapshot");
    const [row, options] = mocks.upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(row.id).toBe(LANDING_PREVIEW_SNAPSHOT_ID);
    expect(row.payload).toBe(payload);
    expect(row.source_course_id).toBe("course-1");
    expect(row.source_lesson_id).toBe("lesson-1");
    expect(options).toEqual({ onConflict: "id" });
  });

  it("returns false and warns when the table does not exist yet", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.state.error = { code: "PGRST205", message: "Could not find the table" };

    await expect(saveLandingPreviewSnapshot({}, source)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  // A snapshot failure must never surface to the admin as a failed save.
  it("returns false and logs on any other write failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { code: "42501", message: "permission denied" };

    await expect(saveLandingPreviewSnapshot({}, source)).resolves.toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
