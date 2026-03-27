import { AppError } from "../lib/appError";
import { isAdminRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import {
  ensureTeacherProfile,
  getNormalizedUserById,
  saveProfile,
} from "./userService";
import type {
  AuthenticatedRequestContext,
  NormalizedUser,
  PublicRegistrationRole,
} from "../types/auth";

type RegisterProfileInput = {
  userId: string;
  email: string;
  fullName: string;
  role: PublicRegistrationRole;
};

type TeacherProfileFields = {
  fullName: string | null;
  headline: string | null;
  bio: string | null;
  specialization: string | null;
  experienceYears: number | null;
  education: string | null;
  gender: "male" | "female" | "other" | null;
  birthDate: string | null;
  avatarPath: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
};

type CurrentAuthenticatedUser = NormalizedUser & Partial<TeacherProfileFields>;

type UpdateCurrentUserProfileInput = {
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  avatarPath?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
};

type BackendError = {
  message: string;
  code?: string;
};

function isMissingOptionalRelationError(error: BackendError, relationName: string) {
  const message = error.message.toLowerCase();
  const relation = relationName.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes(relation) &&
      (message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
}

function pickStringValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickNumberValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

async function getTeacherProfileRecord(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalRelationError(error, "teacher_profiles")) {
      return null;
    }

    throw new AppError(
      500,
      `Unable to load teacher profile: ${error.message}`,
      "TEACHER_PROFILE_FETCH_FAILED"
    );
  }

  return (data as Record<string, unknown> | null) ?? null;
}

function getTeacherProfileFields(
  teacherProfile: Record<string, unknown> | null
): TeacherProfileFields {
  return {
    fullName: pickStringValue(teacherProfile, ["full_name", "fullName"]),
    headline: pickStringValue(teacherProfile, ["headline"]),
    bio: pickStringValue(teacherProfile, ["bio"]),
    specialization: pickStringValue(teacherProfile, ["specialization"]),
    experienceYears: pickNumberValue(teacherProfile, [
      "experience_years",
      "experienceYears",
    ]),
    education: pickStringValue(teacherProfile, ["education"]),
    gender: pickStringValue(teacherProfile, ["gender"]) as TeacherProfileFields["gender"],
    birthDate: pickStringValue(teacherProfile, ["birth_date", "birthDate"]),
    avatarPath: pickStringValue(teacherProfile, ["avatar_path", "avatarPath"]),
    linkedinUrl: pickStringValue(teacherProfile, ["linkedin_url", "linkedinUrl"]),
    githubUrl: pickStringValue(teacherProfile, ["github_url", "githubUrl"]),
  };
}

function assertTeacherProfileRequirements(input: UpdateCurrentUserProfileInput) {
  const fieldErrors: Record<string, string[]> = {};

  if (!input.fullName?.trim()) {
    fieldErrors.fullName = ["Full name is required."];
  }

  if (!input.headline?.trim()) {
    fieldErrors.headline = ["Headline is required."];
  }

  if (!input.education?.trim()) {
    fieldErrors.education = ["Education is required."];
  }

  if (!input.gender) {
    fieldErrors.gender = ["Gender is required."];
  }

  if (!input.birthDate?.trim()) {
    fieldErrors.birthDate = ["Birth date is required."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      400,
      "Complete all required fields before saving.",
      "TEACHER_PROFILE_REQUIRED_FIELDS",
      {
        formErrors: ["Complete all required fields before saving."],
        fieldErrors,
      }
    );
  }
}

async function patchTeacherProfile(
  userId: string,
  input: Partial<UpdateCurrentUserProfileInput>
) {
  await ensureTeacherProfile(userId);

  const payload: Record<string, string | number | null> = {};

  if ("fullName" in input) {
    payload.full_name = input.fullName?.trim() ?? null;
  }

  if ("headline" in input) {
    payload.headline = input.headline?.trim() ?? null;
  }

  if ("bio" in input) {
    payload.bio = input.bio?.trim() ?? null;
  }

  if ("specialization" in input) {
    payload.specialization = input.specialization?.trim() ?? null;
  }

  if ("experienceYears" in input) {
    payload.experience_years = input.experienceYears ?? null;
  }

  if ("education" in input) {
    payload.education = input.education?.trim() ?? null;
  }

  if ("gender" in input) {
    payload.gender = input.gender ?? null;
  }

  if ("birthDate" in input) {
    payload.birth_date = input.birthDate?.trim() ?? null;
  }

  if ("avatarPath" in input) {
    payload.avatar_path = input.avatarPath?.trim() ?? null;
  }

  if ("linkedinUrl" in input) {
    payload.linkedin_url = input.linkedinUrl?.trim() ?? null;
  }

  if ("githubUrl" in input) {
    payload.github_url = input.githubUrl?.trim() ?? null;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("teacher_profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    throw new AppError(
      500,
      `Unable to update teacher profile: ${error.message}`,
      "TEACHER_PROFILE_UPDATE_FAILED"
    );
  }
}

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
    await patchTeacherProfile(input.userId, { fullName: input.fullName });
  }

  const updatedUser = await getNormalizedUserById(input.userId, input.email);

  if (!updatedUser) {
    throw new AppError(500, "Profile was saved but could not be reloaded.", "PROFILE_RELOAD_FAILED");
  }

  return updatedUser;
}

export async function getMe(
  auth: AuthenticatedRequestContext
): Promise<CurrentAuthenticatedUser> {
  if (!auth.role) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  const teacherProfile =
    auth.role === "teacher" ? await getTeacherProfileRecord(auth.userId) : null;
  const teacherProfileFields =
    auth.role === "teacher" ? getTeacherProfileFields(teacherProfile) : null;

  return {
    id: auth.userId,
    email: auth.email,
    fullName: auth.fullName ?? teacherProfileFields?.fullName ?? null,
    role: auth.role,
    isAdmin: auth.isAdmin,
    isSuperAdmin: auth.isSuperAdmin,
    createdAt: auth.createdAt,
    ...(teacherProfileFields ?? {}),
  };
}

export async function updateCurrentUserProfile(
  auth: AuthenticatedRequestContext,
  input: UpdateCurrentUserProfileInput
): Promise<CurrentAuthenticatedUser> {
  if (!auth.role) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  const teacherProfile =
    auth.role === "teacher" ? await getTeacherProfileRecord(auth.userId) : null;
  const teacherProfileFields =
    auth.role === "teacher" ? getTeacherProfileFields(teacherProfile) : null;

  if (auth.role === "teacher") {
    assertTeacherProfileRequirements({
      fullName: input.fullName ?? auth.fullName ?? teacherProfileFields?.fullName ?? undefined,
      headline: input.headline ?? teacherProfileFields?.headline ?? undefined,
      bio: input.bio ?? teacherProfileFields?.bio ?? undefined,
      specialization: input.specialization ?? teacherProfileFields?.specialization ?? undefined,
      experienceYears:
        input.experienceYears ?? teacherProfileFields?.experienceYears ?? undefined,
      education: input.education ?? teacherProfileFields?.education ?? undefined,
      gender: input.gender ?? teacherProfileFields?.gender ?? undefined,
      birthDate: input.birthDate ?? teacherProfileFields?.birthDate ?? undefined,
      avatarPath: input.avatarPath ?? teacherProfileFields?.avatarPath ?? undefined,
      linkedinUrl: input.linkedinUrl ?? teacherProfileFields?.linkedinUrl ?? undefined,
      githubUrl: input.githubUrl ?? teacherProfileFields?.githubUrl ?? undefined,
    });
  }

  const nextFullName =
    input.fullName === undefined ? auth.fullName : input.fullName.trim();

  await saveProfile({
    id: auth.userId,
    email: auth.email,
    full_name: nextFullName ?? null,
    role: auth.role,
  });

  if (auth.role === "teacher") {
    await patchTeacherProfile(auth.userId, {
      ...input,
      fullName: nextFullName ?? undefined,
    });
  }

  const updatedUser = await getNormalizedUserById(auth.userId, auth.email);

  if (!updatedUser) {
    throw new AppError(
      500,
      "Profile was updated but could not be reloaded.",
      "PROFILE_RELOAD_FAILED"
    );
  }

  const updatedTeacherProfile =
    updatedUser.role === "teacher" ? await getTeacherProfileRecord(updatedUser.id) : null;
  const updatedTeacherProfileFields =
    updatedUser.role === "teacher" ? getTeacherProfileFields(updatedTeacherProfile) : null;

  return {
    ...updatedUser,
    fullName: updatedUser.fullName ?? updatedTeacherProfileFields?.fullName ?? null,
    ...(updatedTeacherProfileFields ?? {}),
  };
}
