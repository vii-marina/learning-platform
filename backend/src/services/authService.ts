import { AppError, toServiceError } from "../lib/appError";
import { isAdminRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import {
  ensureStudentProfile,
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

type StudentProfileFields = {
  avatarPath: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  educationPlace: string | null;
  bio: string | null;
  birthDate: string | null;
};

type CurrentAuthenticatedUser = NormalizedUser &
  Partial<TeacherProfileFields> &
  Partial<StudentProfileFields>;

type UpdateCurrentUserProfileInput = {
  email?: string;
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  educationPlace?: string | null;
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

async function updateAuthUserEmail(userId: string, email: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email,
  });

  if (!error) {
    return;
  }

  if (isDuplicateEmailError(error)) {
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

  console.error(`[AUTH_EMAIL_UPDATE_FAILED] Unable to update email: ${error.message}`);
  throw new AppError(
    500,
    "Unable to update email.",
    "AUTH_EMAIL_UPDATE_FAILED",
    {
      fieldErrors: {
        email: ["Unable to update email. Try again later."],
      },
    }
  );
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

    throw toServiceError(500, "TEACHER_PROFILE_FETCH_FAILED", "Unable to load teacher profile", error);
  }

  return (data as Record<string, unknown> | null) ?? null;
}

async function getStudentProfileRecord(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalRelationError(error, "student_profiles")) {
      return null;
    }

    throw toServiceError(500, "STUDENT_PROFILE_FETCH_FAILED", "Unable to load student profile", error);
  }

  return (data as Record<string, unknown> | null) ?? null;
}

function getTeacherProfileFields(
  teacherProfile: Record<string, unknown> | null
): TeacherProfileFields {
  return {
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

function getStudentProfileFields(
  studentProfile: Record<string, unknown> | null
): StudentProfileFields {
  return {
    avatarPath: pickStringValue(studentProfile, ["avatar_path", "avatarPath"]),
    githubUrl: pickStringValue(studentProfile, ["github_url", "githubUrl"]),
    linkedinUrl: pickStringValue(studentProfile, ["linkedin_url", "linkedinUrl"]),
    educationPlace: pickStringValue(studentProfile, [
      "education_place",
      "educationPlace",
    ]),
    bio: pickStringValue(studentProfile, ["bio"]),
    birthDate: pickStringValue(studentProfile, ["birth_date", "birthDate"]),
  };
}

function assertTeacherProfileRequirements(input: UpdateCurrentUserProfileInput) {
  const fieldErrors: Record<string, string[]> = {};

  if (!input.email?.trim()) {
    fieldErrors.email = ["Email is required."];
  }

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

function assertStudentProfileRequirements(input: UpdateCurrentUserProfileInput) {
  const fieldErrors: Record<string, string[]> = {};

  if (!input.email?.trim()) {
    fieldErrors.email = ["Email is required."];
  }

  if (!input.fullName?.trim()) {
    fieldErrors.fullName = ["Full name is required."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(
      400,
      "Complete all required fields before saving.",
      "STUDENT_PROFILE_REQUIRED_FIELDS",
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
    throw toServiceError(500, "TEACHER_PROFILE_UPDATE_FAILED", "Unable to update teacher profile", error);
  }
}

async function patchStudentProfile(
  userId: string,
  input: Partial<UpdateCurrentUserProfileInput>
) {
  await ensureStudentProfile(userId);

  const payload: Record<string, string | null> = {};

  if ("bio" in input) {
    payload.bio = input.bio?.trim() ?? null;
  }

  if ("educationPlace" in input) {
    payload.education_place = input.educationPlace?.trim() ?? null;
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
    .from("student_profiles")
    .update(payload)
    .eq("id", userId);

  if (error) {
    throw toServiceError(500, "STUDENT_PROFILE_UPDATE_FAILED", "Unable to update student profile", error);
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
    await ensureTeacherProfile(input.userId);
  } else if (nextRole === "student") {
    await ensureStudentProfile(input.userId);
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

  const currentUser = await getNormalizedUserById(auth.userId, auth.email);

  if (!currentUser) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  const teacherProfile =
    currentUser.role === "teacher" ? await getTeacherProfileRecord(auth.userId) : null;
  const teacherProfileFields =
    currentUser.role === "teacher" ? getTeacherProfileFields(teacherProfile) : null;
  const studentProfile =
    currentUser.role === "student" ? await getStudentProfileRecord(auth.userId) : null;
  const studentProfileFields =
    currentUser.role === "student" ? getStudentProfileFields(studentProfile) : null;

  return {
    ...currentUser,
    fullName: currentUser.fullName ?? null,
    ...(teacherProfileFields ?? {}),
    ...(studentProfileFields ?? {}),
  };
}

export async function updateCurrentUserProfile(
  auth: AuthenticatedRequestContext,
  input: UpdateCurrentUserProfileInput
): Promise<CurrentAuthenticatedUser> {
  if (!auth.role) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  const currentUser = await getNormalizedUserById(auth.userId, auth.email);

  if (!currentUser) {
    throw new AppError(404, "Profile not found for the current user.", "PROFILE_NOT_FOUND");
  }

  const teacherProfile =
    currentUser.role === "teacher" ? await getTeacherProfileRecord(auth.userId) : null;
  const teacherProfileFields =
    currentUser.role === "teacher" ? getTeacherProfileFields(teacherProfile) : null;
  const studentProfile =
    currentUser.role === "student" ? await getStudentProfileRecord(auth.userId) : null;
  const studentProfileFields =
    currentUser.role === "student" ? getStudentProfileFields(studentProfile) : null;

  if (currentUser.role === "teacher") {
    assertTeacherProfileRequirements({
      email: input.email ?? currentUser.email ?? undefined,
      fullName: input.fullName ?? currentUser.fullName ?? undefined,
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
  } else if (currentUser.role === "student") {
    assertStudentProfileRequirements({
      email: input.email ?? currentUser.email ?? undefined,
      fullName: input.fullName ?? currentUser.fullName ?? undefined,
      bio: input.bio ?? studentProfileFields?.bio ?? undefined,
      educationPlace: input.educationPlace ?? studentProfileFields?.educationPlace ?? undefined,
      birthDate: input.birthDate ?? studentProfileFields?.birthDate ?? undefined,
      avatarPath: input.avatarPath ?? studentProfileFields?.avatarPath ?? undefined,
      linkedinUrl: input.linkedinUrl ?? studentProfileFields?.linkedinUrl ?? undefined,
      githubUrl: input.githubUrl ?? studentProfileFields?.githubUrl ?? undefined,
    });
  }

  const nextEmail =
    input.email === undefined ? currentUser.email : normalizeEmailValue(input.email);
  const nextFullName =
    input.fullName === undefined ? currentUser.fullName : input.fullName.trim();

  if (nextEmail !== currentUser.email) {
    await updateAuthUserEmail(auth.userId, nextEmail);
  }

  await saveProfile({
    id: auth.userId,
    email: nextEmail,
    full_name: nextFullName ?? null,
    role: currentUser.role,
  });

  if (currentUser.role === "teacher") {
    await patchTeacherProfile(auth.userId, {
      ...input,
      email: nextEmail,
      fullName: nextFullName ?? undefined,
    });
  } else if (currentUser.role === "student") {
    await patchStudentProfile(auth.userId, {
      ...input,
      email: nextEmail,
      fullName: nextFullName ?? undefined,
    });
  }

  const updatedUser = await getNormalizedUserById(auth.userId, nextEmail);

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
  const updatedStudentProfile =
    updatedUser.role === "student" ? await getStudentProfileRecord(updatedUser.id) : null;
  const updatedStudentProfileFields =
    updatedUser.role === "student" ? getStudentProfileFields(updatedStudentProfile) : null;

  return {
    ...updatedUser,
    fullName: updatedUser.fullName ?? null,
    ...(updatedTeacherProfileFields ?? {}),
    ...(updatedStudentProfileFields ?? {}),
  };
}
