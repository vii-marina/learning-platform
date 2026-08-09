import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedUser, UserRole } from "../../src/types/auth";

// registerProfile is pure orchestration over userService, so userService is replaced wholesale
// and lib/supabase is stubbed out — nothing here can reach a real database.
const mocks = vi.hoisted(() => {
  const state = { reloadQueue: [] as (NormalizedUser | null)[] };

  // registerProfile calls this twice: once to read the existing profile, once to reload the
  // saved one. The queue makes both answers explicit per test.
  const getNormalizedUserById = vi.fn(async () => {
    const next = state.reloadQueue.shift();
    return next === undefined ? null : next;
  });

  const saveProfile = vi.fn(async (_payload: Record<string, unknown>) => {});
  const ensureTeacherProfile = vi.fn(async () => {});
  const ensureStudentProfile = vi.fn(async () => {});

  return { state, getNormalizedUserById, saveProfile, ensureTeacherProfile, ensureStudentProfile };
});

vi.mock("../../src/lib/supabase", () => ({ supabaseAdmin: {} }));

vi.mock("../../src/services/userService", () => ({
  getNormalizedUserById: mocks.getNormalizedUserById,
  saveProfile: mocks.saveProfile,
  ensureTeacherProfile: mocks.ensureTeacherProfile,
  ensureStudentProfile: mocks.ensureStudentProfile,
}));

const { registerProfile } = await import("../../src/services/authService");

const USER_ID = "user-1";
const EMAIL = "learner@example.com";

function userWithRole(role: UserRole): NormalizedUser {
  return {
    id: USER_ID,
    email: EMAIL,
    fullName: "Learner",
    role,
    isAdmin: role === "admin" || role === "super-admin",
    isSuperAdmin: role === "super-admin",
    createdAt: null,
  };
}

function savedRole() {
  return mocks.saveProfile.mock.calls[0]?.[0]?.role as UserRole | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.reloadQueue = [];
});

// The request body may only choose a role while no profile exists. Once one does, the stored role
// wins — otherwise a user demoted by a super-admin could re-POST /auth/register-profile and hand
// themselves `teacher` back, regaining /authoring/* and the AI routes (which spend real money).
describe("registerProfile role handling", () => {
  it("applies the requested role when the user has no profile yet", async () => {
    mocks.state.reloadQueue = [null, userWithRole("teacher")];

    await registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "teacher" });

    expect(savedRole()).toBe("teacher");
    expect(mocks.ensureTeacherProfile).toHaveBeenCalledWith(USER_ID);
  });

  it("ignores a requested role change for an existing student", async () => {
    mocks.state.reloadQueue = [userWithRole("student"), userWithRole("student")];

    const user = await registerProfile({
      userId: USER_ID,
      email: EMAIL,
      fullName: "Learner",
      role: "teacher",
    });

    expect(savedRole()).toBe("student");
    expect(user.role).toBe("student");
    expect(mocks.ensureTeacherProfile).not.toHaveBeenCalled();
    expect(mocks.ensureStudentProfile).toHaveBeenCalledWith(USER_ID);
  });

  it("does not let a demoted teacher re-elevate by repeating the call", async () => {
    mocks.state.reloadQueue = [userWithRole("student"), userWithRole("student")];

    await registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "teacher" });
    expect(savedRole()).toBe("student");

    mocks.saveProfile.mockClear();
    mocks.state.reloadQueue = [userWithRole("student"), userWithRole("student")];

    await registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "teacher" });
    expect(savedRole()).toBe("student");
  });

  it("keeps an existing teacher a teacher when student is requested", async () => {
    mocks.state.reloadQueue = [userWithRole("teacher"), userWithRole("teacher")];

    await registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "student" });

    expect(savedRole()).toBe("teacher");
  });

  it("never downgrades an admin", async () => {
    mocks.state.reloadQueue = [userWithRole("super-admin"), userWithRole("super-admin")];

    await registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "teacher" });

    expect(savedRole()).toBe("super-admin");
    expect(mocks.ensureTeacherProfile).not.toHaveBeenCalled();
    expect(mocks.ensureStudentProfile).not.toHaveBeenCalled();
  });

  it("fails loudly when the saved profile cannot be reloaded", async () => {
    mocks.state.reloadQueue = [null, null];

    await expect(
      registerProfile({ userId: USER_ID, email: EMAIL, fullName: "Learner", role: "student" })
    ).rejects.toMatchObject({ statusCode: 500, code: "PROFILE_RELOAD_FAILED" });
  });
});
