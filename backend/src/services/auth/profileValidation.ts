/**
 * Profile field readers and the completeness rules a role's profile must satisfy.
 *
 * Kept pure so the rules can be exercised directly: what counts as a complete teacher
 * profile is a product decision, and it is easier to check a list of assertions than to
 * drive it through an HTTP handler.
 */

import { AppError } from "../../lib/appError";
import type { NormalizedUser, PublicRegistrationRole } from "../../types/auth";


export type RegisterProfileInput = {
  userId: string;
  email: string;
  fullName: string;
  role: PublicRegistrationRole;
};

export type TeacherProfileFields = {
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

export type StudentProfileFields = {
  avatarPath: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  educationPlace: string | null;
  bio: string | null;
  birthDate: string | null;
};

export type CurrentAuthenticatedUser = NormalizedUser &
  Partial<TeacherProfileFields> &
  Partial<StudentProfileFields>;

export type UpdateCurrentUserProfileInput = {
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

export type BackendError = {
  message: string;
  code?: string;
};

export function isMissingOptionalRelationError(error: BackendError, relationName: string) {
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

export function pickStringValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
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

export function pickNumberValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
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

export function normalizeEmailValue(value: string) {
  return value.trim().toLowerCase();
}

export function isDuplicateEmailError(error: BackendError) {
  const message = error.message.toLowerCase();

  return (
    message.includes("already been registered") ||
    message.includes("already exists") ||
    message.includes("already in use") ||
    message.includes("email exists")
  );
}

export function assertTeacherProfileRequirements(input: UpdateCurrentUserProfileInput) {
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

export function assertStudentProfileRequirements(input: UpdateCurrentUserProfileInput) {
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
