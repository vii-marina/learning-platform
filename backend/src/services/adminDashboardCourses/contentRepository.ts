/**
 * Course-tree reads for the admin screens.
 *
 * The admin sees the whole tree — modules, lessons, blocks, tests, questions, answers — so
 * these are fetched level by level, each level batching the ids produced by the last.
 */

import { toServiceError } from "../../lib/appError";
import { chunkValues } from "../../lib/collections";
import { isAdminRole, normalizeUserRole } from "../../lib/roles";
import { supabaseAdmin } from "../../lib/supabase";
import { listAdminRecordsByIds } from "../userService";
import type { AdminRow, NormalizedUser, UserProfileRow } from "../../types/auth";
import type {
  CourseProgressRow,
  CourseRow,
  ExerciseIdRow,
  LessonBlockRow,
  LessonRow,
  ModuleRow,
  TestAnswerRow,
  TestEntityRow,
  TestQuestionRow,
  UpdateCoursePayload,
} from "./types";

const profileSelect = "id,email,full_name,role,created_at";

// `admins` decides elevation, `profiles.role` is only the fallback — the same rule the request
// context uses (normalizeUserRole).
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

export async function listCourses() {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(500, "COURSES_LIST_FAILED", "Unable to list courses", error);
  }

  return (data ?? []) as CourseRow[];
}

export async function getCourseById(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  return (data as CourseRow | null) ?? null;
}

export async function getCourseByIdIncludingDeleted(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  return (data as CourseRow | null) ?? null;
}

export async function updateCourseById(courseId: string, payload: UpdateCoursePayload) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_UPDATE_FAILED", "Unable to update course", error);
  }

  return (data as CourseRow | null) ?? null;
}

export async function listProfilesByIds(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, NormalizedUser>();
  }

  const profiles: UserProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .in("id", chunk);

    if (error) {
      throw toServiceError(500, "COURSE_TEACHERS_FETCH_FAILED", "Unable to load course teachers", error);
    }

    profiles.push(...((data ?? []) as UserProfileRow[]));
  }

  const adminRecords = await listAdminRecordsByIds(profiles.map((profile) => profile.id));
  const users = profiles.map((profile) =>
    toNormalizedUser(profile, adminRecords.get(profile.id) ?? null)
  );
  return new Map(users.map((user) => [user.id, user]));
}

export async function listModules(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as ModuleRow[];
  }

  const modules: ModuleRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("*")
      .in("course_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "MODULES_LIST_FAILED", "Unable to list modules", error);
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
      .select("*")
      .in("module_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to list lessons", error);
    }

    lessons.push(...((data ?? []) as LessonRow[]));
  }

  return lessons;
}

export async function listCourseProgress(courseIds: string[]) {
  if (courseIds.length === 0) {
    return [] as CourseProgressRow[];
  }

  const progressRows: CourseProgressRow[] = [];

  for (const chunk of chunkValues(courseIds)) {
    const { data, error } = await supabaseAdmin
      .from("course_progress")
      .select("course_id,user_id,finished_at")
      .in("course_id", chunk);

    if (error) {
      throw toServiceError(
        500,
        "COURSE_PROGRESS_LIST_FAILED",
        "Unable to list course enrollments",
        error
      );
    }

    progressRows.push(...((data ?? []) as CourseProgressRow[]));
  }

  return progressRows;
}

export function buildCourseEnrollmentStats(progressRows: CourseProgressRow[]) {
  const statsByCourseId = new Map<
    string,
    { enrolledStudentCount: number; completedStudentCount: number }
  >();
  const seenStudentCoursePairs = new Set<string>();

  for (const row of progressRows) {
    const key = `${row.course_id}:${row.user_id}`;

    if (seenStudentCoursePairs.has(key)) {
      continue;
    }

    seenStudentCoursePairs.add(key);
    const stats = statsByCourseId.get(row.course_id) ?? {
      enrolledStudentCount: 0,
      completedStudentCount: 0,
    };

    stats.enrolledStudentCount += 1;

    if (row.finished_at) {
      stats.completedStudentCount += 1;
    }

    statsByCourseId.set(row.course_id, stats);
  }

  return statsByCourseId;
}

export async function listLessonBlocks(lessonIds: string[]) {
  if (lessonIds.length === 0) {
    return [] as LessonBlockRow[];
  }

  const blocks: LessonBlockRow[] = [];

  for (const chunk of chunkValues(lessonIds)) {
    const { data, error } = await supabaseAdmin
      .from("lesson_blocks")
      .select("*")
      .in("lesson_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "LESSON_BLOCKS_LIST_FAILED", "Unable to list lesson blocks", error);
    }

    blocks.push(...((data ?? []) as LessonBlockRow[]));
  }

  return blocks;
}

export async function listTests(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as TestEntityRow[];
  }

  const tests: TestEntityRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_entities")
      .select("*")
      .in("module_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "TESTS_LIST_FAILED", "Unable to list module tests", error);
    }

    tests.push(...((data ?? []) as TestEntityRow[]));
  }

  return tests;
}

export async function listQuestions(testIds: string[]) {
  if (testIds.length === 0) {
    return [] as TestQuestionRow[];
  }

  const questions: TestQuestionRow[] = [];

  for (const chunk of chunkValues(testIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_questions")
      .select("*")
      .in("test_id", chunk)
      .order("order", { ascending: true });

    if (error) {
      throw toServiceError(500, "QUESTIONS_LIST_FAILED", "Unable to list test questions", error);
    }

    questions.push(...((data ?? []) as TestQuestionRow[]));
  }

  return questions;
}

export async function listAnswers(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [] as TestAnswerRow[];
  }

  const answers: TestAnswerRow[] = [];

  for (const chunk of chunkValues(questionIds)) {
    const { data, error } = await supabaseAdmin
      .from("test_answers")
      .select("*")
      .in("question_id", chunk);

    if (error) {
      throw toServiceError(500, "ANSWERS_LIST_FAILED", "Unable to list test answers", error);
    }

    answers.push(...((data ?? []) as TestAnswerRow[]));
  }

  return answers;
}

export async function listExercisesByModuleIds(moduleIds: string[]) {
  if (moduleIds.length === 0) {
    return [] as ExerciseIdRow[];
  }

  const exercises: ExerciseIdRow[] = [];

  for (const chunk of chunkValues(moduleIds)) {
    const { data, error } = await supabaseAdmin
      .from("exercises")
      .select("id")
      .in("module_id", chunk);

    if (error) {
      throw toServiceError(500, "EXERCISES_LIST_FAILED", "Unable to list exercises", error);
    }

    exercises.push(...((data ?? []) as ExerciseIdRow[]));
  }

  return exercises;
}
