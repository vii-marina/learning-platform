import { AppError } from "../lib/appError";
import { isAdminRole } from "../lib/roles";
import {
  ensureTeacherProfile,
  getNormalizedUserById,
  saveProfile,
} from "./userService";
import type { PublicRegistrationRole, NormalizedUser } from "../types/auth";

type RegisterProfileInput = {
  userId: string;
  email: string;
  fullName: string;
  role: PublicRegistrationRole;
};

export async function registerProfile(input: RegisterProfileInput): Promise<NormalizedUser> {
  const existingUser = await getNormalizedUserById(input.userId, input.email);
  const nextRole = existingUser && isAdminRole(existingUser.role) ? existingUser.role : input.role;

  await saveProfile({
    id: input.userId,
    email: input.email,
    full_name: input.fullName,
    role: nextRole,
  });

  if (nextRole === "teacher") {
    await ensureTeacherProfile(input.userId);
  }

  const updatedUser = await getNormalizedUserById(input.userId, input.email);

  if (!updatedUser) {
    throw new AppError(500, "Profile was saved but could not be reloaded.", "PROFILE_RELOAD_FAILED");
  }

  return updatedUser;
}

export async function getMe(userId: string, email: string): Promise<NormalizedUser> {
  const currentUser = await getNormalizedUserById(userId, email);

  if (!currentUser) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  return currentUser;
}
