/**
 * The teacher profile form's own state shape and the fields unique to it.
 *
 * Everything a teacher and a student profile share lives in `profile/profileFormFields`;
 * only the experience-years handling is teacher-specific, and it is here because "a whole
 * non-negative number of years" is a rule, not a formatting detail.
 */

import type { CurrentUser, TeacherProfileGender } from "../../auth/types";
import type { FieldStatus } from "../../profile/profileFormFields";

export type TeacherProfileFormState = {
  email: string;
  fullName: string;
  headline: string;
  bio: string;
  specialization: string;
  experienceYears: string;
  education: string;
  gender: TeacherProfileGender | "";
  birthDate: string;
  avatarPath: string;
  linkedinUrl: string;
  githubUrl: string;
};


export function getTeacherDisplayName(teacher: CurrentUser) {
  return teacher.fullName?.trim() || teacher.email;
}


export function normalizeExperienceYears(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function toFormState(teacher: CurrentUser): TeacherProfileFormState {
  return {
    email: teacher.email,
    fullName: teacher.fullName ?? "",
    headline: teacher.headline ?? "",
    bio: teacher.bio ?? "",
    specialization: teacher.specialization ?? "",
    experienceYears:
      teacher.experienceYears === null || teacher.experienceYears === undefined
        ? ""
        : String(teacher.experienceYears),
    education: teacher.education ?? "",
    gender: teacher.gender ?? "",
    birthDate: teacher.birthDate ?? "",
    avatarPath: teacher.avatarPath ?? "",
    linkedinUrl: teacher.linkedinUrl ?? "",
    githubUrl: teacher.githubUrl ?? "",
  };
}


export function getExperienceStatus(value: string): FieldStatus {
  if (!value.trim()) {
    return "neutral";
  }

  return normalizeExperienceYears(value) !== null ? "valid" : "invalid";
}

