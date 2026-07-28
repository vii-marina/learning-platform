import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicLandingPreview } from "../types";

// F1 contract: prefer the always-on Supabase snapshot, fall back to the backend
// endpoint whenever the snapshot is absent, malformed or unreachable — never
// leave the landing without a preview just because the snapshot path failed.
const mocks = vi.hoisted(() => {
  const state = {
    snapshotRow: null as { payload?: unknown } | null,
    snapshotError: null as { message: string } | null,
    snapshotThrows: false,
  };

  type QueryBuilder = {
    select: () => QueryBuilder;
    eq: () => QueryBuilder;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  };

  const supabase = {
    from() {
      const builder: QueryBuilder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (state.snapshotThrows) {
            throw new Error("network down");
          }
          return { data: state.snapshotRow, error: state.snapshotError };
        },
      };
      return builder;
    },
  };

  const publicBackendRequest = vi.fn();

  return { state, supabase, publicBackendRequest };
});

vi.mock("../../../lib/supabase", () => ({ supabase: mocks.supabase }));
vi.mock("../../../features/auth/api/backendClient", () => ({
  publicBackendRequest: mocks.publicBackendRequest,
}));

const { loadLandingPreview } = await import("./landingPreviewSource");

function buildPreview(courseId: string): PublicLandingPreview {
  return {
    course: {
      id: courseId,
      title: "Основи Python",
      description: null,
      slug: "osnovy-python",
      thumbnail_path: null,
    },
    module: { id: "module-1" },
    lesson: { id: "lesson-1" },
    module_lessons: [{ id: "lesson-1" }],
    test: null,
    exercise: null,
  } as unknown as PublicLandingPreview;
}

beforeEach(() => {
  mocks.state.snapshotRow = null;
  mocks.state.snapshotError = null;
  mocks.state.snapshotThrows = false;
  mocks.publicBackendRequest.mockReset();
  mocks.publicBackendRequest.mockResolvedValue(buildPreview("from-backend"));
});

describe("loadLandingPreview", () => {
  it("uses the snapshot and never calls the backend", async () => {
    mocks.state.snapshotRow = { payload: buildPreview("from-snapshot") };

    const preview = await loadLandingPreview();

    expect(preview.course.id).toBe("from-snapshot");
    expect(mocks.publicBackendRequest).not.toHaveBeenCalled();
  });

  it("falls back to the backend when the snapshot row is absent", async () => {
    mocks.state.snapshotRow = null;

    const preview = await loadLandingPreview();

    expect(preview.course.id).toBe("from-backend");
    expect(mocks.publicBackendRequest).toHaveBeenCalledWith("/public/landing-preview");
  });

  // The table does not exist until the migration is run — that must degrade, not break.
  it("falls back when Supabase returns an error", async () => {
    mocks.state.snapshotError = { message: "could not find the table" };

    await expect(loadLandingPreview()).resolves.toMatchObject({
      course: { id: "from-backend" },
    });
  });

  it("falls back when the snapshot query throws", async () => {
    mocks.state.snapshotThrows = true;

    await expect(loadLandingPreview()).resolves.toMatchObject({
      course: { id: "from-backend" },
    });
  });

  it("falls back when the stored payload is missing required fields", async () => {
    mocks.state.snapshotRow = { payload: { course: { id: "half-written" } } };

    await expect(loadLandingPreview()).resolves.toMatchObject({
      course: { id: "from-backend" },
    });
  });

  it("falls back when the payload is not an object", async () => {
    mocks.state.snapshotRow = { payload: "not-a-preview" };

    await expect(loadLandingPreview()).resolves.toMatchObject({
      course: { id: "from-backend" },
    });

    mocks.state.snapshotRow = { payload: null };

    await expect(loadLandingPreview()).resolves.toMatchObject({
      course: { id: "from-backend" },
    });
  });

  it("propagates a backend failure when both sources fail", async () => {
    mocks.publicBackendRequest.mockRejectedValue(new Error("backend asleep"));

    await expect(loadLandingPreview()).rejects.toThrow("backend asleep");
  });
});
