/**
 * Reads behind the teacher dashboard.
 *
 * `user_test_results` is treated as optional: the dashboard still renders course and lesson
 * figures when that table is unavailable, rather than failing outright.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues } from "../../lib/collections";
import { logger } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabase";
import type { UserProfileRow } from "../../types/auth";
import type {
  CourseProgressRow,
  CourseRow,
  ExerciseRow,
  LessonProgressRow,
  LessonRow,
  ModuleRow,
  TestRow,
  UserTestResultRow,
} from "./types";

export function isMissingOptionalRelationError(error: { message: string; code?: string }) {
  const message = error.message.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("could not find")
  );
}

export async function listTeacherCourses(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("teacher_id", teacherId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load teacher courses", error);
  }

  return (data ?? []) as CourseRow[];
}

export async function listModules(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as ModuleRow[];
  }

  const modules: ModuleRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("id,course_id")
      .in("course_id", chunk);

    if (error) {
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to load modules", error);
    }

    modules.push(...((data ?? []) as ModuleRow[]));
  }

  return modules;
}

export async function listLessons(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as LessonRow[];
  }

  const lessons: LessonRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

export async function listCourseProgressByCourseIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const progressRows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .in("course_id", chunk)
      .order("updated_at", { ascending: false });

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to load course progress",
        error
      );
    }

    progressRows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return progressRows;
}

export async function listStudentProfiles(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, UserProfileRow>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(studentIds)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,role,created_at")
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "STUDENTS_LIST_FAILED", "Unable to load students", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export async function listCompletedLessonProgressByUsers(
  userIds: string[],
  lessonIds: string[]
) {
  if (userIds.length === 0 || lessonIds.length === 0) {
    return [] as LessonProgressRow[];
  }

  const progressRows: LessonProgressRow[] = [];

  for (const lessonChunk of chunkValues(lessonIds)) {
    for (const userChunk of chunkValues(userIds)) {
      const { data, error } = await supabaseAdmin
        .from("lesson_progress")
        .select("user_id,lesson_id,is_completed")
        .eq("is_completed", true)
        .in("lesson_id", lessonChunk)
        .in("user_id", userChunk);

      if (error) {
        throw toServiceError(
          500,
          "LESSON_PROGRESS_LIST_FAILED",
          "Unable to load lesson progress",
          error
        );
      }

      progressRows.push(...((data ?? []) as LessonProgressRow[]));
    }
  }

  return progressRows;
}

export async function listTests(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as TestRow[];
  }

  const tests: TestRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to load tests", error);
    }

    tests.push(...((data ?? []) as TestRow[]));
  }

  return tests;
}

export async function listExercises(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as ExerciseRow[];
  }

  const exercises: ExerciseRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("exercises")
      .select("id,module_id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "EXERCISES_LIST_FAILED",
        "Unable to load exercises",
        error
      );
    }

    exercises.push(...((data ?? []) as ExerciseRow[]));
  }

  return exercises;
}

export async function listOptionalUserTestResults(userIds: string[], testIds: string[]) {
  if (userIds.length === 0 || testIds.length === 0) {
    return [] as UserTestResultRow[];
  }

  const results: UserTestResultRow[] = [];

  for (const userChunk of chunkValues(userIds)) {
    for (const testChunk of chunkValues(testIds)) {
      const { data, error } = await supabaseAdmin
        .from("user_test_results")
        .select("*")
        .in("user_id", userChunk)
        .in("test_id", testChunk);

      if (error) {
        if (isMissingOptionalRelationError(error)) {
          return [];
        }

        logger.warn("Unable to load user test results for the teacher dashboard", {
          code: "TEACHER_DASHBOARD_TEST_RESULTS_UNAVAILABLE",
          detail: error.message,
        });
        return [];
      }

      results.push(...((data ?? []) as UserTestResultRow[]));
    }
  }

  return results;
}
