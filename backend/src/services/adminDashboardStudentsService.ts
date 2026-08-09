/**
 * The admin's student management API.
 *
 * Query and record-shaping detail lives in `adminDashboardStudents/`; this file is the
 * use-case layer that orders those calls.
 */

import { AppError, toServiceError } from "../lib/appError";
import { chunkValues } from "../lib/collections";
import { supabaseAdmin } from "../lib/supabase";
import {
  deleteStudentResults,
  getOptionalStudentProfile,
  listContentIdsByModuleIds,
  listCourseTitlesById,
  listLessonsByModuleIds,
  listModulesByCourseIds,
  listOptionalStudentProfiles,
  listStudentProfiles,
} from "./adminDashboardStudents/repository";
import {
  buildEnrollmentDetailsByStudentId,
  buildStudentRecord,
} from "./adminDashboardStudents/studentRecord";
import type {
  AdminDashboardStudent,
  AdminDashboardStudentProfileInput,
  StudentProfileRow,
} from "./adminDashboardStudents/types";
import { updateCurrentUserProfile } from "./authService";
import { deleteStudentAccount, getRequestAuthContext } from "./userService";

export type {
  AdminDashboardStudent,
  AdminStudentCourseEnrollment,
} from "./adminDashboardStudents/types";

export async function listAdminDashboardStudents(): Promise<AdminDashboardStudent[]> {
  const [students, courseTitlesById] = await Promise.all([
    listStudentProfiles(),
    listCourseTitlesById(),
  ]);
  const studentIds = students.map((student) => student.id);
  const [studentProfilesById, enrollmentDetailsByStudentId] = await Promise.all([
    listOptionalStudentProfiles(studentIds),
    buildEnrollmentDetailsByStudentId(studentIds),
  ]);

  return students.map((student) =>
    buildStudentRecord(
      student,
      studentProfilesById.get(student.id) ?? null,
      courseTitlesById,
      enrollmentDetailsByStudentId.get(student.id) ?? []
    )
  );
}

export async function getAdminDashboardStudent(studentId: string): Promise<AdminDashboardStudent> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "STUDENT_FETCH_FAILED", "Unable to load student", error);
  }

  if (!data) {
    throw new AppError(404, "Student not found.", "STUDENT_NOT_FOUND");
  }

  const [studentProfile, courseTitlesById, enrollmentDetailsByStudentId] = await Promise.all([
    getOptionalStudentProfile(studentId),
    listCourseTitlesById(),
    buildEnrollmentDetailsByStudentId([studentId]),
  ]);

  return buildStudentRecord(
    data as StudentProfileRow,
    studentProfile,
    courseTitlesById,
    enrollmentDetailsByStudentId.get(studentId) ?? []
  );
}

export async function saveAdminDashboardStudentProfile(
  studentId: string,
  input: AdminDashboardStudentProfileInput
): Promise<AdminDashboardStudent> {
  const student = await getAdminDashboardStudent(studentId);
  const authContext = await getRequestAuthContext(studentId, student.email, student.fullName);

  if (authContext.role !== "student") {
    throw new AppError(404, "Student not found.", "STUDENT_NOT_FOUND");
  }

  await updateCurrentUserProfile(authContext, input);
  return getAdminDashboardStudent(studentId);
}

export async function deleteAdminDashboardStudent(studentId: string): Promise<void> {
  await getAdminDashboardStudent(studentId);
  await deleteStudentAccount(studentId);
}

export async function clearAdminDashboardStudentCourse(
  studentId: string,
  courseId: string
): Promise<AdminDashboardStudent> {
  await getAdminDashboardStudent(studentId);

  const modules = await listModulesByCourseIds([courseId]);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await listLessonsByModuleIds(moduleIds);
  const lessonIds = lessons.map((lesson) => lesson.id);

  // Clearing only lesson_progress + course_progress left the student's test scores and exercise
  // completions behind, so a "reset" student came back reading 0% lessons and 100% tests, and the
  // teacher dashboard still showed their results for a course they were removed from.
  const [testIds, exerciseIds] = await Promise.all([
    listContentIdsByModuleIds("test_entities", moduleIds),
    listContentIdsByModuleIds("exercises", moduleIds),
  ]);

  await deleteStudentResults(
    "user_test_results",
    "test_id",
    studentId,
    testIds,
    "USER_TEST_RESULTS_DELETE_FAILED",
    "Unable to clear test results"
  );
  await deleteStudentResults(
    "user_exercise_results",
    "exercise_id",
    studentId,
    exerciseIds,
    "USER_EXERCISE_RESULTS_DELETE_FAILED",
    "Unable to clear exercise results"
  );

  if (lessonIds.length > 0) {
    for (const lessonChunk of chunkValues(lessonIds)) {
      const { error } = await supabaseAdmin
        .from("lesson_progress")
        .delete()
        .eq("user_id", studentId)
        .in("lesson_id", lessonChunk);

      if (error) {
        throw toServiceError(
          500,
          "LESSON_PROGRESS_DELETE_FAILED",
          "Unable to clear lesson progress",
          error
        );
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("course_progress")
    .delete()
    .eq("user_id", studentId)
    .eq("course_id", courseId);

  if (error) {
    throw toServiceError(
      500,
      "COURSE_PROGRESS_DELETE_FAILED",
      "Unable to clear course enrollment",
      error
    );
  }

  return getAdminDashboardStudent(studentId);
}
