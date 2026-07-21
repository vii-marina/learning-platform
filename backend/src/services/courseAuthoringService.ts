import { AppError, toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";

// Course authoring: server-side, ownership-checked CRUD for courses, modules,
// tests, questions, answers, and reordering. These replace the direct-from-
// browser writes that used to run against Supabase with the anon key (WP2).
// Reads stay on the client (RLS-scoped); only writes live here.

type CourseStatus = "draft" | "published" | "archived";
type CourseAccessType = "public" | "private" | "invite";
type TestQuestionType = "true_false" | "single_choice" | "multiple_choice";

type CourseRow = {
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

type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type TestEntityRow = {
  id: string;
  after_lesson_id: string | null;
  module_id: string;
  title: string;
  order: number;
  is_graded: boolean;
  created_at: string;
  updated_at: string;
};

type TestQuestionRow = {
  id: string;
  test_id: string;
  type: TestQuestionType;
  question_text: string;
  order: number;
  hint: string | null;
  created_at: string;
};

type TestAnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  created_at: string;
};

// slug / order helpers (ported from the former frontend courseBuilderApi)
function normalizeCourseSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildDefaultSlug(title: string) {
  const base = normalizeCourseSlug(title) || "course";
  return `${base}-${Date.now().toString(36)}`;
}

function normalizeCourseStatus(isPublished: boolean | undefined): CourseStatus {
  return isPublished ? "published" : "draft";
}

// ownership authorization
function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin) return;
  if (auth.role !== "teacher") {
    throw new AppError(403, "Only teachers or admins can author courses.", "AUTHORING_FORBIDDEN");
  }
}

async function getCourseById(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw toServiceError(500, "COURSE_FETCH_FAILED", "Unable to load course", error);
  if (!data) throw new AppError(404, "Course was not found.", "COURSE_NOT_FOUND");
  return data as CourseRow;
}

async function authorizeCourseAccess(auth: AuthenticatedRequestContext, courseId: string) {
  ensureTeacherOrAdmin(auth);
  const course = await getCourseById(courseId);
  if (!auth.isAdmin && course.teacher_id !== auth.userId) {
    throw new AppError(403, "You cannot manage this course.", "COURSE_ACCESS_DENIED");
  }
  return course;
}

async function getModuleById(moduleId: string) {
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

async function getLessonById(lessonId: string) {
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

async function getTestEntityById(testId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_entities")
    .select("*")
    .eq("id", testId)
    .maybeSingle();
  if (error) throw toServiceError(500, "TEST_FETCH_FAILED", "Unable to load test", error);
  if (!data) throw new AppError(404, "Test was not found.", "TEST_NOT_FOUND");
  return data as TestEntityRow;
}

async function authorizeTestAccess(auth: AuthenticatedRequestContext, testId: string) {
  const test = await getTestEntityById(testId);
  await authorizeModuleAccess(auth, test.module_id);
  return test;
}

async function getQuestionById(questionId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_questions")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw toServiceError(500, "QUESTION_FETCH_FAILED", "Unable to load question", error);
  if (!data) throw new AppError(404, "Question was not found.", "QUESTION_NOT_FOUND");
  return data as TestQuestionRow;
}

async function authorizeQuestionAccess(auth: AuthenticatedRequestContext, questionId: string) {
  const question = await getQuestionById(questionId);
  await authorizeTestAccess(auth, question.test_id);
  return question;
}

async function getAnswerById(answerId: string) {
  const { data, error } = await supabaseAdmin
    .from("test_answers")
    .select("*")
    .eq("id", answerId)
    .maybeSingle();
  if (error) throw toServiceError(500, "ANSWER_FETCH_FAILED", "Unable to load answer", error);
  if (!data) throw new AppError(404, "Answer was not found.", "ANSWER_NOT_FOUND");
  return data as TestAnswerRow;
}

async function authorizeAnswerAccess(auth: AuthenticatedRequestContext, answerId: string) {
  const answer = await getAnswerById(answerId);
  await authorizeQuestionAccess(auth, answer.question_id);
  return answer;
}

// next-order helpers
async function getNextOrder(table: string, column: string, value: string) {
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

// COURSES
export async function createCourse(
  auth: AuthenticatedRequestContext,
  input: {
    title: string;
    description?: string | null;
    status?: CourseStatus;
    access_type?: CourseAccessType;
    slug?: string;
    thumbnail_path?: string | null;
    is_published?: boolean;
  }
) {
  ensureTeacherOrAdmin(auth);
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    teacher_id: auth.userId, // server-authoritative: you can only create your own course
    status: input.status ?? normalizeCourseStatus(input.is_published),
    slug: input.slug?.trim() || buildDefaultSlug(input.title),
    thumbnail_path: input.thumbnail_path ?? null,
    is_published: input.is_published ?? false,
  };
  if (input.access_type) payload.access_type = input.access_type;

  const { data, error } = await supabaseAdmin.from("courses").insert(payload).select("*").single();
  if (error) throw toServiceError(500, "COURSE_CREATE_FAILED", "Unable to create course", error);
  return data as CourseRow;
}

export async function updateCourse(
  auth: AuthenticatedRequestContext,
  courseId: string,
  input: {
    title?: string;
    description?: string | null;
    status?: CourseStatus;
    access_type?: CourseAccessType;
    slug?: string;
    thumbnail_path?: string | null;
    is_published?: boolean;
    deleted_at?: string | null;
  }
) {
  await authorizeCourseAccess(auth, courseId);
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined)
    payload.description = typeof input.description === "string" ? input.description.trim() || null : input.description;
  if (input.status !== undefined) payload.status = input.status;
  if (input.access_type !== undefined) payload.access_type = input.access_type;
  if (input.slug !== undefined) payload.slug = typeof input.slug === "string" ? normalizeCourseSlug(input.slug) : input.slug;
  if (input.thumbnail_path !== undefined) payload.thumbnail_path = input.thumbnail_path;
  if (input.is_published !== undefined) payload.is_published = input.is_published;
  if (input.deleted_at !== undefined) payload.deleted_at = input.deleted_at;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select("*")
    .single();
  if (error) throw toServiceError(500, "COURSE_UPDATE_FAILED", "Unable to update course", error);
  return data as CourseRow;
}

export async function deleteCourse(auth: AuthenticatedRequestContext, courseId: string) {
  await authorizeCourseAccess(auth, courseId);
  const { error } = await supabaseAdmin.from("courses").delete().eq("id", courseId);
  if (error) throw toServiceError(500, "COURSE_DELETE_FAILED", "Unable to delete course", error);
}

// MODULES
export async function createModule(
  auth: AuthenticatedRequestContext,
  input: { course_id: string; title: string; order?: number }
) {
  await authorizeCourseAccess(auth, input.course_id);
  const order = input.order ?? (await getNextOrder("modules", "course_id", input.course_id));
  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({ course_id: input.course_id, title: input.title.trim(), order })
    .select("*")
    .single();
  if (error) throw toServiceError(500, "MODULE_CREATE_FAILED", "Unable to create module", error);
  return data as ModuleRow;
}

export async function updateModule(
  auth: AuthenticatedRequestContext,
  moduleId: string,
  input: { title?: string; order?: number }
) {
  await authorizeModuleAccess(auth, moduleId);
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.order !== undefined) payload.order = input.order;
  const { data, error } = await supabaseAdmin
    .from("modules")
    .update(payload)
    .eq("id", moduleId)
    .select("*")
    .single();
  if (error) throw toServiceError(500, "MODULE_UPDATE_FAILED", "Unable to update module", error);
  return data as ModuleRow;
}

export async function deleteModule(auth: AuthenticatedRequestContext, moduleId: string) {
  await authorizeModuleAccess(auth, moduleId);
  const { error } = await supabaseAdmin.from("modules").delete().eq("id", moduleId);
  if (error) throw toServiceError(500, "MODULE_DELETE_FAILED", "Unable to delete module", error);
}

// TESTS (test_entities)
export async function createTestEntity(
  auth: AuthenticatedRequestContext,
  input: {
    module_id: string;
    after_lesson_id?: string | null;
    title: string;
    order?: number;
    is_graded?: boolean;
  }
) {
  const module = await authorizeModuleAccess(auth, input.module_id);
  if (input.after_lesson_id) {
    const lesson = await authorizeLessonAccess(auth, input.after_lesson_id);
    if (lesson.module_id !== module.id) {
      throw new AppError(400, "Lesson does not belong to the target module.", "TEST_LESSON_MISMATCH");
    }
  }
  const order = input.order ?? (await getNextOrder("test_entities", "module_id", input.module_id));
  const { data, error } = await supabaseAdmin
    .from("test_entities")
    .insert({
      after_lesson_id: input.after_lesson_id ?? null,
      module_id: input.module_id,
      title: input.title.trim(),
      order,
      is_graded: input.is_graded ?? false,
    })
    .select("*")
    .single();
  if (error) throw toServiceError(500, "TEST_CREATE_FAILED", "Unable to create test", error);
  return data as TestEntityRow;
}

export async function updateTestEntity(
  auth: AuthenticatedRequestContext,
  testId: string,
  input: {
    title?: string;
    after_lesson_id?: string | null;
    order?: number;
    is_graded?: boolean;
  }
) {
  const test = await authorizeTestAccess(auth, testId);
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.order !== undefined) payload.order = input.order;
  if (input.is_graded !== undefined) payload.is_graded = input.is_graded;
  if (input.after_lesson_id !== undefined) {
    if (input.after_lesson_id) {
      const lesson = await authorizeLessonAccess(auth, input.after_lesson_id);
      if (lesson.module_id !== test.module_id) {
        throw new AppError(400, "Lesson does not belong to the test's module.", "TEST_LESSON_MISMATCH");
      }
    }
    payload.after_lesson_id = input.after_lesson_id;
  }
  const { data, error } = await supabaseAdmin
    .from("test_entities")
    .update(payload)
    .eq("id", testId)
    .select("*")
    .single();
  if (error) throw toServiceError(500, "TEST_UPDATE_FAILED", "Unable to update test", error);
  return data as TestEntityRow;
}

export async function deleteTestEntity(auth: AuthenticatedRequestContext, testId: string) {
  await authorizeTestAccess(auth, testId);

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("test_questions")
    .select("id")
    .eq("test_id", testId);
  if (questionsError) throw toServiceError(500, "QUESTIONS_LIST_FAILED", "Unable to load questions", questionsError);

  const questionIds = ((questions ?? []) as Array<{ id: string }>).map((q) => q.id);
  if (questionIds.length > 0) {
    const { error: answersError } = await supabaseAdmin
      .from("test_answers")
      .delete()
      .in("question_id", questionIds);
    if (answersError) throw toServiceError(500, "ANSWERS_DELETE_FAILED", "Unable to delete answers", answersError);

    const { error: questionsDeleteError } = await supabaseAdmin
      .from("test_questions")
      .delete()
      .eq("test_id", testId);
    if (questionsDeleteError)
      throw toServiceError(500, "QUESTIONS_DELETE_FAILED", "Unable to delete questions", questionsDeleteError);
  }

  const { error: resultsError } = await supabaseAdmin
    .from("user_test_results")
    .delete()
    .eq("test_id", testId);
  if (resultsError) throw toServiceError(500, "TEST_RESULTS_DELETE_FAILED", "Unable to delete test results", resultsError);

  const { error } = await supabaseAdmin.from("test_entities").delete().eq("id", testId);
  if (error) throw toServiceError(500, "TEST_DELETE_FAILED", "Unable to delete test", error);
}

// TEST QUESTIONS
export async function createTestQuestion(
  auth: AuthenticatedRequestContext,
  input: { test_id: string; type: TestQuestionType; question_text: string; order?: number; hint?: string | null }
) {
  await authorizeTestAccess(auth, input.test_id);
  const order = input.order ?? (await getNextOrder("test_questions", "test_id", input.test_id));
  const { data, error } = await supabaseAdmin
    .from("test_questions")
    .insert({
      test_id: input.test_id,
      type: input.type,
      question_text: input.question_text.trim(),
      order,
      hint: input.hint?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw toServiceError(500, "QUESTION_CREATE_FAILED", "Unable to create question", error);
  return data as TestQuestionRow;
}

export async function updateTestQuestion(
  auth: AuthenticatedRequestContext,
  questionId: string,
  input: { type?: TestQuestionType; question_text?: string; order?: number; hint?: string | null }
) {
  await authorizeQuestionAccess(auth, questionId);
  const payload: Record<string, unknown> = {};
  if (input.type !== undefined) payload.type = input.type;
  if (input.question_text !== undefined) payload.question_text = input.question_text.trim();
  if (input.order !== undefined) payload.order = input.order;
  if (input.hint !== undefined) payload.hint = typeof input.hint === "string" ? input.hint.trim() || null : input.hint;
  const { data, error } = await supabaseAdmin
    .from("test_questions")
    .update(payload)
    .eq("id", questionId)
    .select("*")
    .single();
  if (error) throw toServiceError(500, "QUESTION_UPDATE_FAILED", "Unable to update question", error);
  return data as TestQuestionRow;
}

export async function deleteTestQuestion(auth: AuthenticatedRequestContext, questionId: string) {
  await authorizeQuestionAccess(auth, questionId);
  const { error: answersError } = await supabaseAdmin
    .from("test_answers")
    .delete()
    .eq("question_id", questionId);
  if (answersError) throw toServiceError(500, "ANSWERS_DELETE_FAILED", "Unable to delete answers", answersError);
  const { error } = await supabaseAdmin.from("test_questions").delete().eq("id", questionId);
  if (error) throw toServiceError(500, "QUESTION_DELETE_FAILED", "Unable to delete question", error);
}

// Bulk replace of a test's whole question/answer set in one call. Collapses the
// former N+1 (client made one request per question and per answer). The client
// makes a single request; the backend↔Supabase writes below are in-region.
// Answers are inserted one at a time per question on purpose: there is no answer
// `order` column, so option-index order is derived from `created_at asc` (reads +
// grading rely on this). Sequential inserts give strictly increasing timestamps,
// exactly as the old per-answer flow did.
export async function saveTestQuestions(
  auth: AuthenticatedRequestContext,
  testId: string,
  questions: Array<{
    type: TestQuestionType;
    question_text: string;
    order?: number;
    hint?: string | null;
    answers: Array<{ answer_text: string; is_correct?: boolean }>;
  }>
) {
  await authorizeTestAccess(auth, testId);

  // Clear the existing content (answers first, then questions).
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("test_questions")
    .select("id")
    .eq("test_id", testId);
  if (existingError) throw toServiceError(500, "QUESTIONS_LIST_FAILED", "Unable to load questions", existingError);

  const existingIds = ((existing ?? []) as Array<{ id: string }>).map((q) => q.id);
  if (existingIds.length > 0) {
    const { error: answersDeleteError } = await supabaseAdmin
      .from("test_answers")
      .delete()
      .in("question_id", existingIds);
    if (answersDeleteError) throw toServiceError(500, "ANSWERS_DELETE_FAILED", "Unable to delete answers", answersDeleteError);

    const { error: questionsDeleteError } = await supabaseAdmin
      .from("test_questions")
      .delete()
      .eq("test_id", testId);
    if (questionsDeleteError)
      throw toServiceError(500, "QUESTIONS_DELETE_FAILED", "Unable to delete questions", questionsDeleteError);
  }

  // Recreate in order.
  for (const [index, question] of questions.entries()) {
    const { data: createdQuestion, error: questionError } = await supabaseAdmin
      .from("test_questions")
      .insert({
        test_id: testId,
        type: question.type,
        question_text: question.question_text.trim(),
        order: question.order ?? index + 1,
        hint: question.hint?.trim() || null,
      })
      .select("id")
      .single();
    if (questionError) throw toServiceError(500, "QUESTION_CREATE_FAILED", "Unable to create question", questionError);

    const questionId = (createdQuestion as { id: string }).id;
    for (const answer of question.answers) {
      const { error: answerError } = await supabaseAdmin.from("test_answers").insert({
        question_id: questionId,
        answer_text: answer.answer_text,
        is_correct: answer.is_correct ?? false,
      });
      if (answerError) throw toServiceError(500, "ANSWER_CREATE_FAILED", "Unable to create answer", answerError);
    }
  }
}

// TEST ANSWERS
export async function createTestAnswer(
  auth: AuthenticatedRequestContext,
  input: { question_id: string; answer_text: string; is_correct?: boolean }
) {
  await authorizeQuestionAccess(auth, input.question_id);
  const { data, error } = await supabaseAdmin
    .from("test_answers")
    .insert({
      question_id: input.question_id,
      answer_text: input.answer_text,
      is_correct: input.is_correct ?? false,
    })
    .select("*")
    .single();
  if (error) throw toServiceError(500, "ANSWER_CREATE_FAILED", "Unable to create answer", error);
  return data as TestAnswerRow;
}

export async function updateTestAnswer(
  auth: AuthenticatedRequestContext,
  answerId: string,
  input: { answer_text?: string; is_correct?: boolean }
) {
  await authorizeAnswerAccess(auth, answerId);
  const payload: Record<string, unknown> = {};
  if (input.answer_text !== undefined) payload.answer_text = input.answer_text;
  if (input.is_correct !== undefined) payload.is_correct = input.is_correct;
  const { data, error } = await supabaseAdmin
    .from("test_answers")
    .update(payload)
    .eq("id", answerId)
    .select("*")
    .single();
  if (error) throw toServiceError(500, "ANSWER_UPDATE_FAILED", "Unable to update answer", error);
  return data as TestAnswerRow;
}

export async function deleteTestAnswer(auth: AuthenticatedRequestContext, answerId: string) {
  await authorizeAnswerAccess(auth, answerId);
  const { error } = await supabaseAdmin.from("test_answers").delete().eq("id", answerId);
  if (error) throw toServiceError(500, "ANSWER_DELETE_FAILED", "Unable to delete answer", error);
}

// REORDER (swap two rows' order within the same parent)
async function swapOrder(
  table: "modules" | "lessons" | "lesson_blocks",
  firstId: string,
  secondId: string,
  firstOrder: number,
  secondOrder: number
) {
  const { error } = await supabaseAdmin
    .from(table)
    .upsert([
      { id: firstId, order: secondOrder },
      { id: secondId, order: firstOrder },
    ]);
  if (error) throw toServiceError(500, "REORDER_FAILED", `Unable to reorder ${table}`, error);
}

export async function reorderModules(auth: AuthenticatedRequestContext, firstId: string, secondId: string) {
  const first = await authorizeModuleAccess(auth, firstId);
  const second = await authorizeModuleAccess(auth, secondId);
  if (first.course_id !== second.course_id) {
    throw new AppError(400, "Modules must belong to the same course.", "REORDER_SCOPE_MISMATCH");
  }
  await swapOrder("modules", first.id, second.id, first.order, second.order);
}

async function getOrderedLesson(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id,module_id,order")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw toServiceError(500, "LESSON_FETCH_FAILED", "Unable to load lesson", error);
  if (!data) throw new AppError(404, "Lesson was not found.", "LESSON_NOT_FOUND");
  return data as { id: string; module_id: string; order: number };
}

export async function reorderLessons(auth: AuthenticatedRequestContext, firstId: string, secondId: string) {
  const first = await getOrderedLesson(firstId);
  const second = await getOrderedLesson(secondId);
  if (first.module_id !== second.module_id) {
    throw new AppError(400, "Lessons must belong to the same module.", "REORDER_SCOPE_MISMATCH");
  }
  await authorizeModuleAccess(auth, first.module_id);
  await swapOrder("lessons", first.id, second.id, first.order, second.order);
}

async function getOrderedLessonBlock(lessonBlockId: string) {
  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select("id,lesson_id,order")
    .eq("id", lessonBlockId)
    .maybeSingle();
  if (error) throw toServiceError(500, "LESSON_BLOCK_FETCH_FAILED", "Unable to load lesson block", error);
  if (!data) throw new AppError(404, "Lesson block was not found.", "LESSON_BLOCK_NOT_FOUND");
  return data as { id: string; lesson_id: string; order: number };
}

export async function reorderLessonBlocks(auth: AuthenticatedRequestContext, firstId: string, secondId: string) {
  const first = await getOrderedLessonBlock(firstId);
  const second = await getOrderedLessonBlock(secondId);
  if (first.lesson_id !== second.lesson_id) {
    throw new AppError(400, "Blocks must belong to the same lesson.", "REORDER_SCOPE_MISMATCH");
  }
  await authorizeLessonAccess(auth, first.lesson_id);
  await swapOrder("lesson_blocks", first.id, second.id, first.order, second.order);
}
