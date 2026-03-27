import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";

type CourseOwnershipRow = {
  id: string;
  teacher_id: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
};

type LessonRow = {
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

type LessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
};

function toServiceError(statusCode: number, code: string, fallbackMessage: string, error: { message: string }) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
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

async function getCourseOwnership(courseId: string) {
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

async function getModuleById(moduleId: string) {
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

async function authorizeCourseAccess(auth: AuthenticatedRequestContext, courseId: string) {
  ensureTeacherOrAdmin(auth);
  const course = await getCourseOwnership(courseId);

  if (!auth.isAdmin && course.teacher_id !== auth.userId) {
    throw new AppError(403, "You cannot manage this course.", "COURSE_ACCESS_DENIED");
  }

  return course;
}

async function authorizeModuleAccess(auth: AuthenticatedRequestContext, moduleId: string) {
  const module = await getModuleById(moduleId);
  await authorizeCourseAccess(auth, module.course_id);
  return module;
}

async function getLessonById(lessonId: string) {
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

async function authorizeLessonAccess(auth: AuthenticatedRequestContext, lessonId: string) {
  const lesson = await getLessonById(lessonId);
  await authorizeModuleAccess(auth, lesson.module_id);
  return lesson;
}

async function getLessonBlockById(lessonBlockId: string) {
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

async function authorizeLessonBlockAccess(auth: AuthenticatedRequestContext, lessonBlockId: string) {
  const lessonBlock = await getLessonBlockById(lessonBlockId);
  await authorizeLessonAccess(auth, lessonBlock.lesson_id);
  return lessonBlock;
}

async function getNextLessonOrder(moduleId: string) {
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

async function getNextLessonBlockOrder(lessonId: string) {
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
