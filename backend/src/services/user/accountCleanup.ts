/**
 * Tearing down the rows that reference a user before the user itself is deleted.
 *
 * Optional relations degrade quietly: a missing table means there is nothing to clean, not
 * that the deletion should fail.
 */

import { toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import {
  getAssignedStudentsFieldName,
  getNextAssignedStudentsValue,
  isAuthUserNotFoundError,
  isMissingOptionalRelationError,
} from "./assignedStudents";

export async function deleteOptionalProfileRecord(
  tableName: "teacher_profiles" | "student_profiles",
  userId: string
) {
  const { error } = await supabaseAdmin.from(tableName).delete().eq("id", userId);

  if (error && !isMissingOptionalRelationError(error, tableName)) {
    throw toServiceError(
      500,
      "PROFILE_RELATION_DELETE_FAILED",
      `Unable to remove ${tableName}`,
      error
    );
  }
}

export async function deleteProfileRecord(userId: string) {
  const { error } = await supabaseAdmin.from("profiles").delete().eq("id", userId);

  if (error) {
    throw toServiceError(500, "PROFILE_DELETE_FAILED", "Unable to remove profile", error);
  }
}

export async function clearTeacherCourseReferences(teacherId: string) {
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ teacher_id: null })
    .eq("teacher_id", teacherId);

  if (error) {
    throw toServiceError(
      500,
      "COURSE_TEACHER_REFERENCE_CLEAR_FAILED",
      "Unable to detach teacher from linked courses",
      error
    );
  }
}

export async function removeStudentAssignmentsFromTeacherProfiles(studentId: string) {
  const { data, error } = await supabaseAdmin.from("teacher_profiles").select("*");

  if (error) {
    if (isMissingOptionalRelationError(error, "teacher_profiles")) {
      return;
    }

    throw toServiceError(
      500,
      "TEACHER_PROFILES_LIST_FAILED",
      "Unable to load teacher profiles for assignment cleanup",
      error
    );
  }

  const teacherProfiles = (data ?? []) as Array<Record<string, unknown>>;
  const updates = teacherProfiles
    .map((record) => {
      const teacherId = typeof record.id === "string" ? record.id : null;
      const fieldName = getAssignedStudentsFieldName(record);

      if (!teacherId || !fieldName) {
        return null;
      }

      const { changed, nextValue } = getNextAssignedStudentsValue(record[fieldName], studentId);

      if (!changed) {
        return null;
      }

      return {
        teacherId,
        fieldName,
        nextValue,
      };
    })
    .filter(
      (
        update
      ): update is {
        teacherId: string;
        fieldName: string;
        nextValue: unknown;
      } => Boolean(update)
    );

  await Promise.all(
    updates.map(async ({ teacherId, fieldName, nextValue }) => {
      const { error: updateError } = await supabaseAdmin
        .from("teacher_profiles")
        .update({ [fieldName]: nextValue })
        .eq("id", teacherId);

      if (updateError) {
        throw toServiceError(
          500,
          "TEACHER_PROFILE_ASSIGNMENTS_UPDATE_FAILED",
          "Unable to remove student from teacher assignments",
          updateError
        );
      }
    })
  );
}

export async function deleteAuthUserIfExists(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error && !isAuthUserNotFoundError(error)) {
    throw toServiceError(500, "AUTH_USER_DELETE_FAILED", "Unable to remove auth user", error);
  }
}
