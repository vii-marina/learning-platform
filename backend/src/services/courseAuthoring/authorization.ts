/**
 * Ownership checks for every authoring write.
 *
 * Each entity has a `get…ById` that 404s and an `authorize…Access` that walks up to the
 * owning course. Authorisation always bottoms out at `courses.teacher_id`, with admins
 * bypassing — so an answer, a question and a module are all checked by the same rule.
 *
 * Soft-deleted courses are invisible here, which is what stops a teacher editing or
 * restoring a course an admin archived.
 */

import { AppError, toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import type { AuthenticatedRequestContext } from "../../types/auth";

export type CourseStatus = "draft" | "published" | "archived";
export type CourseAccessType = "public" | "private" | "invite";
export type TestQuestionType = "true_false" | "single_choice" | "multiple_choice";

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string;
  status: CourseStatus;
  access_type: CourseAccessType;
  slug: string;
  thumbnail_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TestEntityRow = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  is_graded: boolean;
  created_at: string;
  updated_at: string;
};

export type TestQuestionRow = {
  id: string;
  test_id: string;
  type: TestQuestionType;
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

export type TestAnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
};

// slug / order helpers (ported from the former frontend courseBuilderApi)
export function normalizeCourseSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildDefaultSlug(title: string) {
  const base = normalizeCourseSlug(title) || "course";
  return `${base}-${Date.now().toString(36)}`;
}

export function normalizeCourseStatus(isPublished: boolean | undefined): CourseStatus {
  return isPublished ? "published" : "draft";
}

// ownership authorization
export function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin) return;
  if (auth.role !== "teacher") {
    throw new AppError(403, "Only teachers or admins can author courses.", "AUTHORING_FORBIDDEN");
  }
}

// Soft-deleted courses are invisible to authoring: a course an admin archived must not stay
// editable, publishable or restorable by its owner. Matches courseBuilderService.getCourseOwnership
// and exerciseService, which have always filtered this.
export async function getCourseById(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  if (!data) throw new AppError(404, "Course was not found.", "COURSE_NOT_FOUND");
  return data as CourseRow;
}

export async function authorizeCourseAccess(auth: AuthenticatedRequestContext, courseId: string) {
  ensureTeacherOrAdmin(auth);
  const course = await getCourseById(courseId);
  if (!auth.isAdmin && course.teacher_id !== auth.userId) {
    throw new AppError(403, "You cannot manage this course.", "COURSE_ACCESS_DENIED");
  }
  return course;
}

export async function getModuleById(moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();
  if (error) throw toServiceError(500, "MODULE_FETCH_FAILED", "Unable to load module", error);
  if (!data) throw new AppError(404, "Module was not found.", "MODULE_NOT_FOUND");
  return data as ModuleRow;
}

export async function authorizeModuleAccess(auth: AuthenticatedRequestContext, moduleId: string) {
  const module = await getModuleById(moduleId);
  await authorizeCourseAccess(auth, module.course_id);
  return module;
}

export async function getLessonById(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id,module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw toServiceError(500, "LESSON_FETCH_FAILED", "Unable to load lesson", error);
  if (!data) throw new AppError(404, "Lesson was not found.", "LESSON_NOT_FOUND");
  return data as { id: string; module_id: string };
}

export async function authorizeLessonAccess(auth: AuthenticatedRequestContext, lessonId: string) {
  const lesson = await getLessonById(lessonId);
  await authorizeModuleAccess(auth, lesson.module_id);
  return lesson;
}

export async function getTestEntityById(testId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_entities")
    .select("*")
    .eq("id", testId)
    .maybeSingle();
  if (error) throw toServiceError(500, "TEST_FETCH_FAILED", "Unable to load test", error);
  if (!data) throw new AppError(404, "Test was not found.", "TEST_NOT_FOUND");
  return data as TestEntityRow;
}

export async function authorizeTestAccess(auth: AuthenticatedRequestContext, testId: string) {
  const test = await getTestEntityById(testId);
  await authorizeModuleAccess(auth, test.module_id);
  return test;
}

export async function getQuestionById(questionId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw toServiceError(500, "QUESTION_FETCH_FAILED", "Unable to load question", error);
  if (!data) throw new AppError(404, "Question was not found.", "QUESTION_NOT_FOUND");
  return data as TestQuestionRow;
}

export async function authorizeQuestionAccess(auth: AuthenticatedRequestContext, questionId: string) {
  const question = await getQuestionById(questionId);
  await authorizeTestAccess(auth, question.test_id);
  return question;
}

export async function getAnswerById(answerId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_answers")
    .select("*")
    .eq("id", answerId)
    .maybeSingle();
  if (error) throw toServiceError(500, "ANSWER_FETCH_FAILED", "Unable to load answer", error);
  if (!data) throw new AppError(404, "Answer was not found.", "ANSWER_NOT_FOUND");
  return data as TestAnswerRow;
}

export async function authorizeAnswerAccess(auth: AuthenticatedRequestContext, answerId: string) {
  const answer = await getAnswerById(answerId);
  await authorizeQuestionAccess(auth, answer.question_id);
  return answer;
}

// next-order helpers
export async function getNextOrder(table: string, column: string, value: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("order")
    .eq(column, value)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toServiceError(500, "ORDER_COMPUTE_FAILED", `Unable to compute order for ${table}`, error);
  return ((data?.order as number | undefined) ?? 0) + 1;
}
