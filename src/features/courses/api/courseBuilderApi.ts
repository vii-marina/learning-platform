import { supabase } from "../../../lib/supabase";
import type {
  Course,
  CourseAccessType,
  CourseStatus,
  CreateCourseInput,
  CreateLessonBlockInput,
  CreateLessonInput,
  CreateModuleInput,
  CreateTestAnswerInput,
  CreateTestEntityInput,
  CreateTestQuestionInput,
  Lesson,
  LessonBlock,
  Module,
  TestAnswer,
  TestEntity,
  TestQuestion,
  UpdateCourseInput,
  UpdateLessonBlockInput,
  UpdateLessonInput,
  UpdateModuleInput,
  UpdateTestAnswerInput,
  UpdateTestEntityInput,
  UpdateTestQuestionInput,
} from "./types";

function toErrorMessage(scope: string, details: string) {
  return `${scope}: ${details}`;
}

function normalizeCourseSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDefaultSlug(title: string) {
  const base = normalizeCourseSlug(title) || "course";
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

function normalizeCourseStatus(isPublished: boolean | undefined): CourseStatus {
  return isPublished ? "published" : "draft";
}

async function getNextModuleOrder(courseId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("order")
    .eq("course_id", courseId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next module order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

async function getNextLessonOrder(moduleId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("order")
    .eq("module_id", moduleId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next lesson order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

async function getNextLessonBlockOrder(lessonId: string) {
  const { data, error } = await supabase
    .from("lesson_blocks")
    .select("order")
    .eq("lesson_id", lessonId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next lesson block order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

async function getNextQuestionOrder(testId: string) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("order")
    .eq("test_id", testId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Unable to compute next question order", error.message));
  }

  return (data?.order ?? 0) + 1;
}

function validateTestEntityTarget(input: CreateTestEntityInput) {
  const hasLesson = Boolean(input.lesson_id);
  const hasModule = Boolean(input.module_id);

  if (hasLesson === hasModule) {
    throw new Error("Test entity must target either lesson_id or module_id.");
  }
}

export async function listCourses(teacherId?: string) {
  const query = supabase
    .from("courses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data, error } = teacherId
    ? await query.eq("teacher_id", teacherId)
    : await query;

  if (error) {
    throw new Error(toErrorMessage("Unable to list courses", error.message));
  }

  return (data ?? []) as Course[];
}

export async function getCourseById(courseId: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to fetch course", error.message));
  }

  return data as Course;
}

export async function createCourse(input: CreateCourseInput) {
  const payload: {
    title: string;
    description: string | null;
    teacher_id: string;
    status: CourseStatus;
    slug: string;
    thumbnail_path: string | null;
    is_published: boolean;
    access_type?: CourseAccessType;
  } = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    teacher_id: input.teacher_id,
    status: input.status ?? normalizeCourseStatus(input.is_published),
    slug: input.slug?.trim() || buildDefaultSlug(input.title),
    thumbnail_path: input.thumbnail_path ?? null,
    is_published: input.is_published ?? false,
  };

  if (input.access_type) {
    payload.access_type = input.access_type;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create course", error.message));
  }

  return data as Course;
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  const payload: UpdateCourseInput = {
    ...input,
    description:
      typeof input.description === "string" ? input.description.trim() || null : input.description,
    slug: typeof input.slug === "string" ? normalizeCourseSlug(input.slug) : input.slug,
  };

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update course", error.message));
  }

  return data as Course;
}

export async function publishCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "published",
    is_published: true,
    deleted_at: null,
  });
}

export async function archiveCourse(courseId: string) {
  return updateCourse(courseId, {
    status: "archived",
    is_published: false,
  });
}

export async function softDeleteCourse(courseId: string) {
  return updateCourse(courseId, {
    deleted_at: new Date().toISOString(),
    status: "archived",
    is_published: false,
  });
}

export async function deleteCourse(courseId: string) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete course", error.message));
  }
}

export async function listModulesByCourse(courseId: string) {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list modules", error.message));
  }

  return (data ?? []) as Module[];
}

export async function createModule(input: CreateModuleInput) {
  const order = input.order ?? (await getNextModuleOrder(input.course_id));

  const { data, error } = await supabase
    .from("modules")
    .insert({
      course_id: input.course_id,
      title: input.title.trim(),
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create module", error.message));
  }

  return data as Module;
}

export async function updateModule(moduleId: string, input: UpdateModuleInput) {
  const { data, error } = await supabase
    .from("modules")
    .update({
      ...input,
      title: typeof input.title === "string" ? input.title.trim() : input.title,
    })
    .eq("id", moduleId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update module", error.message));
  }

  return data as Module;
}

export async function deleteModule(moduleId: string) {
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete module", error.message));
  }
}

export async function swapModuleOrder(first: Module, second: Module) {
  const { error } = await supabase.from("modules").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder modules", error.message));
  }
}

export async function listLessonsByModule(moduleId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list lessons", error.message));
  }

  return (data ?? []) as Lesson[];
}

export async function createLesson(input: CreateLessonInput) {
  const order = input.order ?? (await getNextLessonOrder(input.module_id));

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: input.module_id,
      title: input.title.trim(),
      content: input.content ?? null,
      video_url: input.video_url?.trim() || null,
      content_type: input.content_type ?? null,
      order,
      is_locked: input.is_locked ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create lesson", error.message));
  }

  return data as Lesson;
}

export async function updateLesson(lessonId: string, input: UpdateLessonInput) {
  const { data, error } = await supabase
    .from("lessons")
    .update({
      ...input,
      title: typeof input.title === "string" ? input.title.trim() : input.title,
      video_url:
        typeof input.video_url === "string" ? input.video_url.trim() || null : input.video_url,
    })
    .eq("id", lessonId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update lesson", error.message));
  }

  return data as Lesson;
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete lesson", error.message));
  }
}

export async function swapLessonOrder(first: Lesson, second: Lesson) {
  const { error } = await supabase.from("lessons").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder lessons", error.message));
  }
}

export async function listLessonBlocksByLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list lesson blocks", error.message));
  }

  return (data ?? []) as LessonBlock[];
}

export async function createLessonBlock(input: CreateLessonBlockInput) {
  const order = input.order ?? (await getNextLessonBlockOrder(input.lesson_id));

  const { data, error } = await supabase
    .from("lesson_blocks")
    .insert({
      lesson_id: input.lesson_id,
      block_type: input.block_type,
      content: input.content,
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create lesson block", error.message));
  }

  return data as LessonBlock;
}

export async function updateLessonBlock(lessonBlockId: string, input: UpdateLessonBlockInput) {
  const { data, error } = await supabase
    .from("lesson_blocks")
    .update(input)
    .eq("id", lessonBlockId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update lesson block", error.message));
  }

  return data as LessonBlock;
}

export async function deleteLessonBlock(lessonBlockId: string) {
  const { error } = await supabase.from("lesson_blocks").delete().eq("id", lessonBlockId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete lesson block", error.message));
  }
}

export async function upsertLessonPrimaryRichTextBlock(lessonId: string, html: string) {
  const blocks = await listLessonBlocksByLesson(lessonId);
  const firstBlock = blocks[0];

  if (firstBlock) {
    return updateLessonBlock(firstBlock.id, {
      block_type: firstBlock.block_type,
      content: { html },
    });
  }

  return createLessonBlock({
    lesson_id: lessonId,
    block_type: "rich_text",
    content: { html },
    order: 1,
  });
}

export async function swapLessonBlockOrder(first: LessonBlock, second: LessonBlock) {
  const { error } = await supabase.from("lesson_blocks").upsert([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);

  if (error) {
    throw new Error(toErrorMessage("Unable to reorder lesson blocks", error.message));
  }
}

export async function listTestsByModule(moduleId: string) {
  const { data, error } = await supabase
    .from("test_entities")
    .select("*")
    .eq("module_id", moduleId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list module tests", error.message));
  }

  return (data ?? []) as TestEntity[];
}

export async function listTestsByLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("test_entities")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list lesson tests", error.message));
  }

  return (data ?? []) as TestEntity[];
}

export async function createTestEntity(input: CreateTestEntityInput) {
  validateTestEntityTarget(input);

  const { data, error } = await supabase
    .from("test_entities")
    .insert({
      lesson_id: input.lesson_id ?? null,
      module_id: input.module_id ?? null,
      passing_percentage: input.passing_percentage ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test entity", error.message));
  }

  return data as TestEntity;
}

export async function updateTestEntity(testId: string, input: UpdateTestEntityInput) {
  const { data, error } = await supabase
    .from("test_entities")
    .update(input)
    .eq("id", testId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test entity", error.message));
  }

  return data as TestEntity;
}

export async function deleteTestEntity(testId: string) {
  const { error } = await supabase.from("test_entities").delete().eq("id", testId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test entity", error.message));
  }
}

export async function listTestQuestions(testId: string) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("*")
    .eq("test_id", testId)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list test questions", error.message));
  }

  return (data ?? []) as TestQuestion[];
}

export async function createTestQuestion(input: CreateTestQuestionInput) {
  const order = input.order ?? (await getNextQuestionOrder(input.test_id));

  const { data, error } = await supabase
    .from("test_questions")
    .insert({
      test_id: input.test_id,
      type: input.type,
      question_text: input.question_text,
      order,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test question", error.message));
  }

  return data as TestQuestion;
}

export async function updateTestQuestion(questionId: string, input: UpdateTestQuestionInput) {
  const { data, error } = await supabase
    .from("test_questions")
    .update(input)
    .eq("id", questionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test question", error.message));
  }

  return data as TestQuestion;
}

export async function deleteTestQuestion(questionId: string) {
  const { error } = await supabase.from("test_questions").delete().eq("id", questionId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test question", error.message));
  }
}

export async function listTestAnswers(questionId: string) {
  const { data, error } = await supabase
    .from("test_answers")
    .select("*")
    .eq("question_id", questionId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Unable to list test answers", error.message));
  }

  return (data ?? []) as TestAnswer[];
}

export async function createTestAnswer(input: CreateTestAnswerInput) {
  const { data, error } = await supabase
    .from("test_answers")
    .insert({
      question_id: input.question_id,
      answer_text: input.answer_text,
      is_correct: input.is_correct ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to create test answer", error.message));
  }

  return data as TestAnswer;
}

export async function updateTestAnswer(answerId: string, input: UpdateTestAnswerInput) {
  const { data, error } = await supabase
    .from("test_answers")
    .update(input)
    .eq("id", answerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(toErrorMessage("Unable to update test answer", error.message));
  }

  return data as TestAnswer;
}

export async function deleteTestAnswer(answerId: string) {
  const { error } = await supabase.from("test_answers").delete().eq("id", answerId);

  if (error) {
    throw new Error(toErrorMessage("Unable to delete test answer", error.message));
  }
}
