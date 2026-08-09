import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../src/lib/appError";
import type { AuthenticatedRequestContext } from "../../src/types/auth";

// The service is imported for its ownership guards only — Supabase is replaced by
// an in-memory stub, so no test here can reach a real database.
const mocks = vi.hoisted(() => {
  const rowsByTable = new Map<string, unknown>();

  type StubFilter = { column: string; value: unknown };

  type QueryBuilder = {
    select: () => QueryBuilder;
    eq: (column: string, value: unknown) => QueryBuilder;
    is: (column: string, value: unknown) => QueryBuilder;
    maybeSingle: () => Promise<{ data: unknown; error: null }>;
  };

  // The stub honours the filters it is given: a seeded row is returned only when every
  // eq()/is() matches it. A column the seeded row omits reads as null, so `.is("deleted_at", null)`
  // passes for a live row and fails once a test seeds a deleted_at timestamp.
  function resolveRow(table: string, filters: StubFilter[]) {
    const row = rowsByTable.get(table) as Record<string, unknown> | null | undefined;

    if (!row) {
      return null;
    }

    const matchesEveryFilter = filters.every(
      ({ column, value }) => (row[column] ?? null) === (value ?? null)
    );

    return matchesEveryFilter ? row : null;
  }

  const supabaseAdmin = {
    from(table: string) {
      const filters: StubFilter[] = [];
      const builder: QueryBuilder = {
        select: () => builder,
        eq: (column, value) => {
          filters.push({ column, value });
          return builder;
        },
        is: (column, value) => {
          filters.push({ column, value });
          return builder;
        },
        maybeSingle: async () => ({ data: resolveRow(table, filters), error: null }),
      };
      return builder;
    },
  };

  return { rowsByTable, supabaseAdmin };
});

vi.mock("../../src/lib/supabase", () => ({ supabaseAdmin: mocks.supabaseAdmin }));

const { authorizeLessonAccess, authorizeModuleAccess } = await import(
  "../../src/services/courseAuthoringService"
);

const OWNER_ID = "teacher-owner";
const OTHER_TEACHER_ID = "teacher-intruder";

function authContext(
  overrides: Partial<AuthenticatedRequestContext> = {}
): AuthenticatedRequestContext {
  return {
    userId: OWNER_ID,
    email: "owner@example.com",
    fullName: "Owner",
    role: "teacher",
    isAdmin: false,
    isSuperAdmin: false,
    createdAt: null,
    profileExists: true,
    ...overrides,
  };
}

function seedOwnedCourseChain() {
  mocks.rowsByTable.set("lessons", { id: "lesson-1", module_id: "module-1" });
  mocks.rowsByTable.set("modules", { id: "module-1", course_id: "course-1" });
  mocks.rowsByTable.set("courses", { id: "course-1", teacher_id: OWNER_ID });
}

async function expectAppError(operation: Promise<unknown>, statusCode: number, code: string) {
  await expect(operation).rejects.toThrow(AppError);
  await operation.catch((error: unknown) => {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(statusCode);
    expect((error as AppError).code).toBe(code);
  });
}

beforeEach(() => {
  mocks.rowsByTable.clear();
  seedOwnedCourseChain();
});

// R2 / R11 regression: authoring and AI generation are only allowed on content
// the caller owns. These guards are the single enforcement point behind
// /authoring/* and /api/ai/* — RLS is a backstop, not the primary check.
describe("authorizeModuleAccess", () => {
  it("allows the owning teacher", async () => {
    await expect(authorizeModuleAccess(authContext(), "module-1")).resolves.toMatchObject({
      id: "module-1",
      course_id: "course-1",
    });
  });

  it("denies a teacher who does not own the course", async () => {
    await expectAppError(
      authorizeModuleAccess(authContext({ userId: OTHER_TEACHER_ID }), "module-1"),
      403,
      "COURSE_ACCESS_DENIED"
    );
  });

  it("allows an admin regardless of ownership", async () => {
    await expect(
      authorizeModuleAccess(
        authContext({ userId: "admin-1", role: "admin", isAdmin: true }),
        "module-1"
      )
    ).resolves.toMatchObject({ id: "module-1" });
  });

  it("allows a super-admin regardless of ownership", async () => {
    await expect(
      authorizeModuleAccess(
        authContext({
          userId: "admin-1",
          role: "super-admin",
          isAdmin: true,
          isSuperAdmin: true,
        }),
        "module-1"
      )
    ).resolves.toMatchObject({ id: "module-1" });
  });

  it("denies a student even when they own nothing", async () => {
    await expectAppError(
      authorizeModuleAccess(authContext({ userId: "student-1", role: "student" }), "module-1"),
      403,
      "AUTHORING_FORBIDDEN"
    );
  });

  it("denies a caller with no resolved role", async () => {
    await expectAppError(
      authorizeModuleAccess(authContext({ role: null }), "module-1"),
      403,
      "AUTHORING_FORBIDDEN"
    );
  });

  it("reports a missing module as 404", async () => {
    mocks.rowsByTable.set("modules", null);

    await expectAppError(
      authorizeModuleAccess(authContext(), "module-missing"),
      404,
      "MODULE_NOT_FOUND"
    );
  });

  it("reports a missing parent course as 404", async () => {
    mocks.rowsByTable.set("courses", null);

    await expectAppError(
      authorizeModuleAccess(authContext(), "module-1"),
      404,
      "COURSE_NOT_FOUND"
    );
  });

  // A course an admin soft-deleted must drop out of authoring entirely — otherwise its owner
  // could keep editing it and, because updateCourse accepted `deleted_at: null`, restore and
  // republish it. courseBuilderService and exerciseService have always filtered this.
  it("treats a soft-deleted course as missing, even for its owner", async () => {
    mocks.rowsByTable.set("courses", {
      id: "course-1",
      teacher_id: OWNER_ID,
      deleted_at: "2026-08-01T10:00:00.000Z",
    });

    await expectAppError(
      authorizeModuleAccess(authContext(), "module-1"),
      404,
      "COURSE_NOT_FOUND"
    );
  });

  it("still allows the owner when deleted_at is explicitly null", async () => {
    mocks.rowsByTable.set("courses", {
      id: "course-1",
      teacher_id: OWNER_ID,
      deleted_at: null,
    });

    await expect(authorizeModuleAccess(authContext(), "module-1")).resolves.toMatchObject({
      id: "module-1",
    });
  });
});

describe("authorizeLessonAccess", () => {
  it("allows the owning teacher through the lesson → module → course chain", async () => {
    await expect(authorizeLessonAccess(authContext(), "lesson-1")).resolves.toMatchObject({
      id: "lesson-1",
      module_id: "module-1",
    });
  });

  it("denies a teacher who owns a different course", async () => {
    await expectAppError(
      authorizeLessonAccess(authContext({ userId: OTHER_TEACHER_ID }), "lesson-1"),
      403,
      "COURSE_ACCESS_DENIED"
    );
  });

  it("reports a missing lesson as 404", async () => {
    mocks.rowsByTable.set("lessons", null);

    await expectAppError(
      authorizeLessonAccess(authContext(), "lesson-missing"),
      404,
      "LESSON_NOT_FOUND"
    );
  });

  it("denies a student", async () => {
    await expectAppError(
      authorizeLessonAccess(authContext({ role: "student" }), "lesson-1"),
      403,
      "AUTHORING_FORBIDDEN"
    );
  });
});
