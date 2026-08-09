/**
 * Field readers for teacher profiles, plus the student lookup that expands a teacher's
 * assigned-student ids into real records.
 *
 * The readers are pure and tolerate the several shapes the assigned-students field takes
 * across environments; the same problem the student side has.
 */

import { toServiceError } from "../../lib/appError";
import { isAdminRole, normalizeUserRole } from "../../lib/roles";
import { supabaseAdmin } from "../../lib/supabase";
import type { AdminRow, NormalizedUser, UserProfileRow } from "../../types/auth";
import { listAdminRecordsByIds } from "../userService";
import type { TeacherProfileRow } from "./types";

const profileSelect = "id,email,full_name,role,created_at";

// `admins` decides elevation, `profiles.role` is only the fallback — the same rule the
// request context uses.
function toNormalizedUser(
  profile: UserProfileRow,
  adminRecord: AdminRow | null = null
): NormalizedUser {
  const role = normalizeUserRole(profile.role, adminRecord) ?? profile.role;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    isAdmin: isAdminRole(role),
    isSuperAdmin: role === "super-admin",
    createdAt: profile.created_at,
  };
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

export function pickArrayValue(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
  }

  return [];
}

export function extractAssignedStudentIds(record: TeacherProfileRow | null | undefined) {
  const values = pickArrayValue(record, [
    "assigned_student_ids",
    "assignedStudents",
    "student_ids",
    "students",
  ]);

  const ids = values
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string"
      ) {
        return value.id;
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set(ids)];
}

export async function listStudentsByIds(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, NormalizedUser>();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(profileSelect)
    .in("id", studentIds)
    .eq("role", "student");

  if (error) {
    throw toServiceError(
      500,
      "STUDENTS_LIST_FAILED",
      "Unable to load assigned students",
      error
    );
  }

  const profiles = (data ?? []) as UserProfileRow[];
  const adminRecords = await listAdminRecordsByIds(profiles.map((profile) => profile.id));
  const students = profiles.map((profile) =>
    toNormalizedUser(profile, adminRecords.get(profile.id) ?? null)
  );
  return new Map(students.map((student) => [student.id, student]));
}
