import { AppError, toServiceError } from "../lib/appError";
import {
  ensureTeacherProfile,
  ensureStudentProfile,
  getAuthUserById,
  getNormalizedUserById,
  listManagedUsers,
  listProfileUsersByRole,
  deleteStudentAccount,
  deleteTeacherAccount,
  removeAdminRecord,
  saveAdminRecord,
  saveProfile,
} from "./userService";
import { logger } from "../lib/logger";
import { supabaseAdmin } from "../lib/supabase";
import type { NormalizedUser, PublicRegistrationRole, UserRole } from "../types/auth";

type UpdateUserInput = {
  fullName?: string | null;
  role?: UserRole;
};

type CreateManagedUserInput = {
  email: string;
  fullName: string;
  password: string;
  role: PublicRegistrationRole;
};

type BackendError = {
  message: string;
};

function normalizeEmailValue(value: string) {
  return value.trim().toLowerCase();
}

function isDuplicateEmailError(error: BackendError) {
  const message = error.message.toLowerCase();

  return (
    message.includes("already been registered") ||
    message.includes("already exists") ||
    message.includes("already in use") ||
    message.includes("email exists")
  );
}

export async function listUsers(role?: UserRole): Promise<NormalizedUser[]> {
  if (role === "teacher" || role === "student") {
    return listProfileUsersByRole(role);
  }

  const users = await listManagedUsers();

  if (!role) {
    return users;
  }

  return users.filter((user) => user.role === role);
}

export async function createManagedUser(input: CreateManagedUserInput): Promise<NormalizedUser> {
  const normalizedEmail = normalizeEmailValue(input.email);
  const trimmedFullName = input.fullName.trim();
  let createdUserId: string | null = null;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedFullName,
        role: input.role,
      },
    });

    if (error || !data.user) {
      if (error && isDuplicateEmailError(error)) {
        throw new AppError(
          400,
          "This email is already in use.",
          "EMAIL_ALREADY_IN_USE",
          {
            formErrors: ["Use a different email address and try again."],
            fieldErrors: {
              email: ["This email is already in use."],
            },
          }
        );
      }

      // R16: the error handler returns AppError.message verbatim, so the upstream detail is
      // logged server-side and never interpolated into the response.
      throw toServiceError(
        500,
        "AUTH_USER_CREATE_FAILED",
        "Unable to create the user.",
        error ?? { message: "Unknown error." }
      );
    }

    createdUserId = data.user.id;

    await saveProfile({
      id: createdUserId,
      email: normalizedEmail,
      full_name: trimmedFullName,
      role: input.role,
    });

    if (input.role === "teacher") {
      await ensureTeacherProfile(createdUserId);
    } else {
      await ensureStudentProfile(createdUserId);
    }

    const createdUser = await getNormalizedUserById(createdUserId, normalizedEmail);

    if (!createdUser) {
      throw new AppError(
        500,
        "User was created but could not be reloaded.",
        "USER_RELOAD_FAILED"
      );
    }

    return createdUser;
  } catch (error) {
    if (createdUserId) {
      try {
        if (input.role === "teacher") {
          await deleteTeacherAccount(createdUserId);
        } else {
          await deleteStudentAccount(createdUserId);
        }
      } catch (cleanupError) {
        // The original failure is what the caller sees; this one would otherwise vanish,
        // leaving an orphaned auth user with nothing recorded about it.
        logger.error("Failed to roll back a partially created managed user", {
          code: "MANAGED_USER_CLEANUP_FAILED",
          createdUserId,
          role: input.role,
          error: cleanupError,
        });
      }
    }

    throw error;
  }
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<NormalizedUser> {
  const existingUser = await getNormalizedUserById(userId);
  const authUser = existingUser ? null : await getAuthUserById(userId);
  const currentRole = existingUser?.role ?? null;
  const nextRole = input.role ?? currentRole;

  if (!nextRole) {
    throw new AppError(
      400,
      "Role is required when the target user does not have a profile yet.",
      "ROLE_REQUIRED"
    );
  }

  if (currentRole === "super-admin" && nextRole !== "super-admin") {
    const superAdmins = await listUsers("super-admin");

    if (superAdmins.length <= 1) {
      throw new AppError(
        400,
        "Cannot demote the last super-admin account.",
        "LAST_SUPER_ADMIN"
      );
    }
  }

  const email = existingUser?.email ?? authUser?.email;

  if (!email) {
    throw new AppError(400, "Target user is missing an email address.", "TARGET_EMAIL_MISSING");
  }

  const fullName =
    input.fullName === undefined ? (existingUser?.fullName ?? null) : input.fullName;

  await saveProfile({
    id: userId,
    email,
    full_name: fullName,
    role: nextRole,
  });

  if (nextRole === "teacher") {
    await ensureTeacherProfile(userId);
  }

  if (nextRole === "admin" || nextRole === "super-admin") {
    await saveAdminRecord(userId, nextRole === "super-admin");
  } else {
    await removeAdminRecord(userId);
  }

  const updatedUser = await getNormalizedUserById(userId, email);

  if (!updatedUser) {
    throw new AppError(500, "User was updated but could not be reloaded.", "USER_RELOAD_FAILED");
  }

  return updatedUser;
}
