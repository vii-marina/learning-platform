/**
 * Database access for the admin's student screens.
 *
 * `student_profiles` is treated as optional throughout: the table may not exist in every
 * environment, so a missing-relation error degrades to "no extra profile" rather than
 * failing the whole screen.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues } from "../../lib/collections";
import { supabaseAdmin } from "../../lib/supabase";
import { isMissingOptionalRelationError } from "./profileFields";
import type {
  CourseProgressRow,
  CourseRow,
  LessonProgressRow,
  LessonRow,
  ModuleRow,
  StudentExtraProfileRow,
  StudentProfileRow,
} from "./types";

export async function listStudentProfiles() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "STUDENTS_LIST_FAILED", "Unable to load students", error);
  }

  return (data ?? []) as StudentProfileRow[];
}

export async function listOptionalStudentProfiles(studentIds: string[]) {
  if (studentIds.length === 0) {
    return new Map<string, StudentExtraProfileRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .in("id", studentIds);

  if (error) {
    if (isMissingOptionalRelationError(error, "student_profiles")) {
      return new Map<string, StudentExtraProfileRow>();
    }

    throw toServiceError(
      500,
      "STUDENT_PROFILES_LIST_FAILED",
      "Unable to load student profiles",
      error
    );
  }

  const rows = (data ?? []) as StudentExtraProfileRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getOptionalStudentProfile(studentId: string) {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalRelationError(error, "student_profiles")) {
      return null;
    }

    throw toServiceError(
      500,
      "STUDENT_PROFILE_FETCH_FAILED",
      "Unable to load student profile",
      error
    );
  }

  return (data as StudentExtraProfileRow | null) ?? null;
}

export async function listCourseTitlesById() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,title,status,thumbnail_path,is_published,deleted_at")
    .is("deleted_at", null);

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load courses", error);
  }

  const courses = (data ?? []) as CourseRow[];
  return new Map(
    courses.map((course) => [course.id, course.title?.trim() || "Untitled course"])
  );
}


export async function listCourseProgressByStudentIds(studentIds: string[]) {
  if (studentIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const rows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(studentIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .in("user_id", chunk)
      .order("updated_at", { ascending: false });

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to load student course progress",
        error
      );
    }

    rows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return rows;
}

export async function listCoursesByIds(courseIds: string[]) {
  if (courseIds.length === 0) {
    return new Map<string, CourseRow>();
  }

  const courses: CourseRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id,title,status,thumbnail_path,is_published,deleted_at")
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to load courses", error);
    }

    courses.push(...((data ?? []) as CourseRow[]));
  }

  return new Map(courses.map((course) => [course.id, course]));
}

export async function listModulesByCourseIds(courseIds: string[]) {
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
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to load course modules", error);
    }

    modules.push(...((data ?? []) as ModuleRow[]));
  }

  return modules;
}

export async function listLessonsByModuleIds(moduleIds: string[]) {
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
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to load course lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

// Ids of the course's graded content, needed to clear a student's results when their enrollment
// is reset. Results are keyed by test_id / exercise_id, never by course, so the ids have to be
// resolved first — the same approach permanentlyDeleteAdminDashboardCourse takes.
export async function listContentIdsByModuleIds(table: "test_entities" | "exercises", moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as string[];
  }

  const ids: string[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin.from(table).select("id").in("module_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "COURSE_CONTENT_LIST_FAILED",
        "Unable to load course content",
        error
      );
    }

    ids.push(...((data ?? []) as Array<{ id: string }>).map((row) => row.id));
  }

  return ids;
}

export async function deleteStudentResults(
  table: "user_test_results" | "user_exercise_results",
  column: "test_id" | "exercise_id",
  studentId: string,
  contentIds: string[],
  errorCode: string,
  errorMessage: string
) {
  for (const chunk of chunkValues(contentIds)) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", studentId)
      .in(column, chunk);

    if (error) {
      throw toServiceError(500, errorCode, errorMessage, error);
    }
  }
}

export async function listCompletedLessonProgress(studentIds: string[], lessonIds: string[]) {
  if (studentIds.length === 0 || lessonIds.length === 0) {
    return [] as LessonProgressRow[];
  }

  const rows: LessonProgressRow[] = [];

  for (const studentChunk of chunkValues(studentIds, 25)) {
    for (const lessonChunk of chunkValues(lessonIds, 50)) {
      const { data, error } = await supabaseAdmin
        .from("lesson_progress")
        .select("user_id,lesson_id")
        .in("user_id", studentChunk)
        .in("lesson_id", lessonChunk)
        .eq("is_completed", true);

      if (error) {
        throw toServiceError(
          500,
          "LESSON_PROGRESS_LIST_FAILED",
          "Unable to load completed lesson progress",
          error
        );
      }

      rows.push(...((data ?? []) as LessonProgressRow[]));
    }
  }

  return rows;
}
