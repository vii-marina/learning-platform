import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

// The service is mocked, so this suite is about one thing only: what the unauthenticated
// handler is allowed to forward from the request.
const mocks = vi.hoisted(() => ({
  getPublicLandingLessonPreview: vi.fn(async () => ({ course: { id: "course-1" } })),
}));

vi.mock("../../src/services/studentDashboardCoursesService", () => ({
  getPublicLandingLessonPreview: mocks.getPublicLandingLessonPreview,
}));

const { getPublicLandingPreviewHandler } = await import(
  "../../src/controllers/publicLandingController"
);

function fakeResponse() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function requestWithQuery(query: Record<string, unknown>) {
  return { query } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// GET /public/landing-preview is the only route in the app with no authentication. It used to
// forward courseId/lessonId/lessonTitle straight into the service, which let anyone read any
// published course's lesson HTML, its answer key (`is_correct`) and its exercise solutions
// without an account — bypassing the enrolment checks the student path enforces. The preview is
// now pinned to the admin's stored landing selection.
describe("getPublicLandingPreviewHandler", () => {
  it("ignores caller-supplied course and lesson ids", async () => {
    const res = fakeResponse();

    await getPublicLandingPreviewHandler(
      requestWithQuery({
        courseId: "some-other-course",
        lessonId: "some-other-lesson",
        lessonTitle: "Anything",
      }),
      res
    );

    expect(mocks.getPublicLandingLessonPreview).toHaveBeenCalledTimes(1);
    expect(mocks.getPublicLandingLessonPreview).toHaveBeenCalledWith();
  });

  it("passes nothing through even when the query is empty", async () => {
    const res = fakeResponse();

    await getPublicLandingPreviewHandler(requestWithQuery({}), res);

    expect(mocks.getPublicLandingLessonPreview).toHaveBeenCalledWith();
  });

  it("returns the stored preview with a 200", async () => {
    const res = fakeResponse();

    await getPublicLandingPreviewHandler(requestWithQuery({ courseId: "ignored" }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ course: { id: "course-1" } });
  });
});
