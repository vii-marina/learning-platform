/**
 * Lesson and lesson-block authoring.
 *
 * Ownership checks live in `courseBuilder/access`; the test rows shown alongside a module's
 * lessons come from `courseBuilder/testContentRepository`.
 */

import { toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";
import {
  authorizeLessonAccess,
  authorizeLessonBlockAccess,
  authorizeModuleAccess,
  getNextLessonBlockOrder,
  getNextLessonOrder,
  type LessonBlockRow,
  type LessonRow,
  type TestAnswerRow,
  type TestQuestionRow,
} from "./courseBuilder/access";
import {
  listModuleTestEntities,
  listTestAnswersByQuestionIds,
  listTestQuestionsByTestIds,
} from "./courseBuilder/testContentRepository";
import { listModuleExercises } from "./exerciseService";



export async function listModuleLessons(auth: AuthenticatedRequestContext, moduleId: string) {
  await authorizeModuleAccess(auth, moduleId);

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order", { ascending: true });

  if (error) {
    throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to list lessons", error);
  }

  return (data ?? []) as LessonRow[];
}

export async function listModuleContent(auth: AuthenticatedRequestContext, moduleId: string) {
  await authorizeModuleAccess(auth, moduleId);

  const [lessons, testEntities, exercises] = await Promise.all([
    supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order", { ascending: true }),
    listModuleTestEntities(moduleId),
    listModuleExercises(auth, moduleId),
  ]);

  if (lessons.error) {
    throw toServiceError(500, "LESSONS_LIST_FAILED", "Unable to list lessons", lessons.error);
  }

  const testQuestions = await listTestQuestionsByTestIds(testEntities.map((test) => test.id));
  const testAnswers = await listTestAnswersByQuestionIds(testQuestions.map((question) => question.id));

  const answersByQuestionId = new Map<string, TestAnswerRow[]>();
  for (const answer of testAnswers) {
    const currentAnswers = answersByQuestionId.get(answer.question_id) ?? [];
    currentAnswers.push(answer);
    answersByQuestionId.set(answer.question_id, currentAnswers);
  }

  const questionsByTestId = new Map<
    string,
    Array<TestQuestionRow & { answers: TestAnswerRow[] }>
  >();
  for (const question of testQuestions) {
    const currentQuestions = questionsByTestId.get(question.test_id) ?? [];
    currentQuestions.push({
      ...question,
      answers: answersByQuestionId.get(question.id) ?? [],
    });
    questionsByTestId.set(question.test_id, currentQuestions);
  }

  const tests = testEntities.map((test) => ({
    ...test,
    questions: questionsByTestId.get(test.id) ?? [],
  }));

  return {
    lessons: (lessons.data ?? []) as LessonRow[],
    tests,
    exercises,
  };
}

export async function createModuleLesson(
  auth: AuthenticatedRequestContext,
  input: {
    moduleId: string;
    title: string;
    content?: string | null;
    videoUrl?: string | null;
    contentType?: string | null;
    order?: number;
  }
) {
  const module = await authorizeModuleAccess(auth, input.moduleId);
  const order = input.order ?? (await getNextLessonOrder(module.id));

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .insert({
      module_id: module.id,
      title: input.title.trim(),
      content: input.content ?? "",
      video_url: input.videoUrl?.trim() || null,
      content_type: input.contentType ?? null,
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw toServiceError(500, "LESSON_CREATE_FAILED", "Unable to create lesson", error);
  }

  return data as LessonRow;
}

export async function updateLessonById(
  auth: AuthenticatedRequestContext,
  lessonId: string,
  input: {
    title?: string;
    content?: string | null;
    videoUrl?: string | null;
    contentType?: string | null;
    order?: number;
  }
) {
  await authorizeLessonAccess(auth, lessonId);

  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) {
    payload.title = input.title.trim();
  }

  if (input.content !== undefined) {
    payload.content = typeof input.content === "string" ? input.content : "";
  }

  if (input.videoUrl !== undefined) {
    payload.video_url = input.videoUrl?.trim() || null;
  }

  if (input.contentType !== undefined) {
    payload.content_type = input.contentType;
  }

  if (input.order !== undefined) {
    payload.order = input.order;
  }

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .update(payload)
    .eq("id", lessonId)
    .select("*")
    .single();

  if (error) {
    throw toServiceError(500, "LESSON_UPDATE_FAILED", "Unable to update lesson", error);
  }

  return data as LessonRow;
}

export async function deleteLessonById(auth: AuthenticatedRequestContext, lessonId: string) {
  await authorizeLessonAccess(auth, lessonId);

  // ⚠️ DO NOT REMOVE THESE TWO UNLINKS. They look defensive; they are load-bearing.
  // `test_entities.after_lesson_id` and `exercises.after_lesson_id` are both declared
  // ON DELETE CASCADE in the database (confirmed 09-08-2026). Those columns record *position*,
  // not ownership — a test simply sits after a lesson. So deleting a lesson without nulling them
  // first makes Postgres delete every test and exercise anchored to it, along with their questions,
  // answers, content and student results. Nulling them first is what keeps the cascade from firing.
  const { error: testLinkError } = await supabaseAdmin
    .from("test_entities")
    .update({ after_lesson_id: null })
    .eq("after_lesson_id", lessonId);

  if (testLinkError) {
    throw toServiceError(
      500,
      "LESSON_TEST_UNLINK_FAILED",
      "Unable to unlink tests from lesson",
      testLinkError
    );
  }

  const { error: exerciseLinkError } = await supabaseAdmin
    .from("exercises")
    .update({ after_lesson_id: null })
    .eq("after_lesson_id", lessonId);

  if (exerciseLinkError) {
    throw toServiceError(
      500,
      "LESSON_EXERCISE_UNLINK_FAILED",
      "Unable to unlink exercises from lesson",
      exerciseLinkError
    );
  }

  const { error: blockDeleteError } = await supabaseAdmin
    .from("lesson_blocks")
    .delete()
    .eq("lesson_id", lessonId);

  if (blockDeleteError) {
    throw toServiceError(
      500,
      "LESSON_BLOCKS_DELETE_FAILED",
      "Unable to delete lesson blocks",
      blockDeleteError
    );
  }

  const { error } = await supabaseAdmin.from("lessons").delete().eq("id", lessonId);

  if (error) {
    throw toServiceError(500, "LESSON_DELETE_FAILED", "Unable to delete lesson", error);
  }
}

export async function listBlocksByLesson(auth: AuthenticatedRequestContext, lessonId: string) {
  await authorizeLessonAccess(auth, lessonId);

  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order", { ascending: true });

  if (error) {
    throw toServiceError(
      500,
      "LESSON_BLOCKS_LIST_FAILED",
      "Unable to list lesson blocks",
      error
    );
  }

  return (data ?? []) as LessonBlockRow[];
}

export async function createLessonBlockForLesson(
  auth: AuthenticatedRequestContext,
  input: {
    lessonId: string;
    blockType: string;
    content: Record<string, unknown>;
    order?: number;
  }
) {
  const lesson = await authorizeLessonAccess(auth, input.lessonId);
  const order = input.order ?? (await getNextLessonBlockOrder(lesson.id));

  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .insert({
      lesson_id: lesson.id,
      block_type: input.blockType.trim(),
      content: input.content,
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw toServiceError(
      500,
      "LESSON_BLOCK_CREATE_FAILED",
      "Unable to create lesson block",
      error
    );
  }

  return data as LessonBlockRow;
}

export async function updateLessonBlockById(
  auth: AuthenticatedRequestContext,
  lessonBlockId: string,
  input: {
    blockType?: string;
    content?: Record<string, unknown>;
    order?: number;
  }
) {
  await authorizeLessonBlockAccess(auth, lessonBlockId);

  const payload: Record<string, unknown> = {};

  if (input.blockType !== undefined) {
    payload.block_type = input.blockType.trim();
  }

  if (input.content !== undefined) {
    payload.content = input.content;
  }

  if (input.order !== undefined) {
    payload.order = input.order;
  }

  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .update(payload)
    .eq("id", lessonBlockId)
    .select("*")
    .single();

  if (error) {
    throw toServiceError(
      500,
      "LESSON_BLOCK_UPDATE_FAILED",
      "Unable to update lesson block",
      error
    );
  }

  return data as LessonBlockRow;
}

export async function deleteLessonBlockById(
  auth: AuthenticatedRequestContext,
  lessonBlockId: string
) {
  await authorizeLessonBlockAccess(auth, lessonBlockId);

  const { error } = await supabaseAdmin
    .from("lesson_blocks")
    .delete()
    .eq("id", lessonBlockId);

  if (error) {
    throw toServiceError(
      500,
      "LESSON_BLOCK_DELETE_FAILED",
      "Unable to delete lesson block",
      error
    );
  }
}
