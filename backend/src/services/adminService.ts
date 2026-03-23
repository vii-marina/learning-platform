import { AppError } from "../lib/appError";
import {
  ensureTeacherProfile,
  getAuthUserById,
  getNormalizedUserById,
  listManagedUsers,
  listProfileUsersByRole,
  removeAdminRecord,
  saveAdminRecord,
  saveProfile,
} from "./userService";
import type { NormalizedUser, UserRole } from "../types/auth";

type UpdateUserInput = {
  fullName?: string | null;
  role?: UserRole;
};

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
