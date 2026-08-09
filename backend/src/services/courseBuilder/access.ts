/**
 * Ownership checks and ordering for the lesson-level authoring endpoints.
 *
 * Every check walks up to `courses.teacher_id` and treats an admin as always permitted,
 * which is the same rule the course-level authoring service applies. Soft-deleted courses
 * are excluded, so an archived course cannot be edited through a lesson it still owns.
 */

import { AppError, toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import type { AuthenticatedRequestContext } from "../../types/auth";

export type CourseOwnershipRow = {
  id: string;
  teacher_id: string | null;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  content_type: string | null;
  order: number;
  created_at: string;
  updated_at: string;
};

export type LessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
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
  created_at: string;
  updated_at: string;
};

export type TestQuestionRow = {
  id: string;
  test_id: string;
  type: string;
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

export function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin) {
    return;
  }

  if (auth.role !== "teacher") {
    throw new AppError(
      403,
      "Only teachers or admins can manage course lessons.",
      "COURSE_BUILDER_FORBIDDEN"
    );
  }
}

export async function getCourseOwnership(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id,teacher_id")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  }

  if (!data) {
    throw new AppError(404, "Course was not found.", "COURSE_NOT_FOUND");
  }

  return data as CourseOwnershipRow;
}

export async function getModuleById(moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "MODULE_FETCH_FAILED", "Unable to load module", error);
  }

  if (!data) {
    throw new AppError(404, "Module was not found.", "MODULE_NOT_FOUND");
  }

  return data as ModuleRow;
}

export async function authorizeCourseAccess(auth: AuthenticatedRequestContext, courseId: string) {
  ensureTeacherOrAdmin(auth);
  const course = await getCourseOwnership(courseId);

  if (!auth.isAdmin && course.teacher_id !== auth.userId) {
    throw new AppError(403, "You cannot manage this course.", "COURSE_ACCESS_DENIED");
  }

  return course;
}

export async function authorizeModuleAccess(auth: AuthenticatedRequestContext, moduleId: string) {
  const module = await getModuleById(moduleId);
  await authorizeCourseAccess(auth, module.course_id);
  return module;
}

export async function getLessonById(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "LESSON_FETCH_FAILED", "Unable to load lesson", error);
  }

  if (!data) {
    throw new AppError(404, "Lesson was not found.", "LESSON_NOT_FOUND");
  }

  return data as LessonRow;
}

export async function authorizeLessonAccess(auth: AuthenticatedRequestContext, lessonId: string) {
  const lesson = await getLessonById(lessonId);
  await authorizeModuleAccess(auth, lesson.module_id);
  return lesson;
}

export async function getLessonBlockById(lessonBlockId: string) {
  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select("*")
    .eq("id", lessonBlockId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "LESSON_BLOCK_FETCH_FAILED", "Unable to load lesson block", error);
  }

  if (!data) {
    throw new AppError(404, "Lesson block was not found.", "LESSON_BLOCK_NOT_FOUND");
  }

  return data as LessonBlockRow;
}

export async function authorizeLessonBlockAccess(auth: AuthenticatedRequestContext, lessonBlockId: string) {
  const lessonBlock = await getLessonBlockById(lessonBlockId);
  await authorizeLessonAccess(auth, lessonBlock.lesson_id);
  return lessonBlock;
}

export async function getNextLessonOrder(moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("order")
    .eq("module_id", moduleId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "LESSON_ORDER_FAILED", "Unable to compute lesson order", error);
  }

  return (data?.order ?? 0) + 1;
}

export async function getNextLessonBlockOrder(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select("order")
    .eq("lesson_id", lessonId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "LESSON_BLOCK_ORDER_FAILED",
      "Unable to compute lesson block order",
      error
    );
  }

  return (data?.order ?? 0) + 1;
}
