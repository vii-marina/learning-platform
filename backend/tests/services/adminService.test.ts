import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../src/lib/appError";

// Only the auth-user creation call is stubbed; every assertion here is about the failure path,
// which throws before userService is reached. Nothing can touch a real database.
const mocks = vi.hoisted(() => {
  const state = {
    error: null as { message: string } | null,
    user: null as { id: string } | null,
  };

  const createUser = vi.fn(async () => ({
    data: { user: state.user },
    error: state.error,
  }));

  return { state, createUser };
});

vi.mock("../../src/lib/supabase", () => ({
  supabaseAdmin: { auth: { admin: { createUser: mocks.createUser } } },
}));

vi.mock("../../src/services/userService", () => ({
  ensureTeacherProfile: vi.fn(),
  ensureStudentProfile: vi.fn(),
  getAuthUserById: vi.fn(),
  getNormalizedUserById: vi.fn(),
  listManagedUsers: vi.fn(),
  listProfileUsersByRole: vi.fn(),
  deleteStudentAccount: vi.fn(),
  deleteTeacherAccount: vi.fn(),
  removeAdminRecord: vi.fn(),
  saveAdminRecord: vi.fn(),
  saveProfile: vi.fn(),
}));

const { createManagedUser } = await import("../../src/services/adminService");

function createInput() {
  return {
    email: "new.teacher@example.com",
    fullName: "New Teacher",
    password: "correct horse battery staple",
    role: "teacher" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.error = null;
  mocks.state.user = null;
});

// R16 regression at the site that was still leaking after the original fix: errorHandler returns
// AppError.message verbatim, so the raw Supabase auth message must never be interpolated into it.
describe("createManagedUser error sanitisation", () => {
  const upstreamDetail =
    'relation "auth.users" does not exist at character 42 — constraint users_pkey';

  it("does not put the upstream auth message in the response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: upstreamDetail };

    await expect(createManagedUser(createInput())).rejects.toThrow(AppError);

    await createManagedUser(createInput()).catch((error: unknown) => {
      const appError = error as AppError;
      expect(appError.message).toBe("Unable to create the user.");
      expect(appError.message).not.toContain(upstreamDetail);
      expect(appError.message).not.toContain("constraint");
      expect(appError.message).not.toContain("auth.users");
    });
  });

  it("preserves the status code and error code", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: upstreamDetail };

    await createManagedUser(createInput()).catch((error: unknown) => {
      const appError = error as AppError;
      expect(appError.statusCode).toBe(500);
      expect(appError.code).toBe("AUTH_USER_CREATE_FAILED");
    });
  });

  it("logs the upstream detail server-side", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = { message: upstreamDetail };

    await createManagedUser(createInput()).catch(() => {});

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0]?.[0]).toContain(upstreamDetail);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("AUTH_USER_CREATE_FAILED");
  });

  it("stays safe when Supabase returns no user and no error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state.error = null;
    mocks.state.user = null;

    await createManagedUser(createInput()).catch((error: unknown) => {
      const appError = error as AppError;
      expect(appError.statusCode).toBe(500);
      expect(appError.message).toBe("Unable to create the user.");
    });
  });

  // The duplicate-email branch is a deliberate 400 with a message written for the user, and it
  // must keep working — it is matched on the upstream text before sanitisation happens.
  it("still reports a duplicate email as a 400", async () => {
    mocks.state.error = { message: "A user with this email address has already been registered" };

    await createManagedUser(createInput()).catch((error: unknown) => {
      const appError = error as AppError;
      expect(appError.statusCode).toBe(400);
      expect(appError.code).toBe("EMAIL_ALREADY_IN_USE");
      expect(appError.message).toBe("This email is already in use.");
    });
  });
});
