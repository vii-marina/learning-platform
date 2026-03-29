import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";

type ExerciseType = "drag_drop_code" | "write_code";

type CourseOwnershipRow = {
  id: string;
  teacher_id: string | null;
};

type ModuleRow = {
  id: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  module_id: string;
};

type ExerciseContent = {
  type: ExerciseType;
} & Record<string, unknown>;

type ExerciseRow = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: ExerciseType;
  title: string;
  description: string | null;
  content: ExerciseContent;
  created_at: string;
  updated_at: string;
};

function toServiceError(
  statusCode: number,
  code: string,
  fallbackMessage: string,
  error: { message: string }
) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
  if (auth.isAdmin) {
    return;
  }

  if (auth.role !== "teacher") {
    throw new AppError(
      403,
      "Only teachers or admins can manage exercises.",
      "EXERCISE_FORBIDDEN"
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
    .select("id,course_id")
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

async function getLessonById(lessonId: string) {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id,module_id")
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

async function getExerciseById(exerciseId: string) {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "EXERCISE_FETCH_FAILED", "Unable to load exercise", error);
  }

  if (!data) {
    throw new AppError(404, "Exercise was not found.", "EXERCISE_NOT_FOUND");
  }

  return data as ExerciseRow;
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

async function authorizeLessonAccess(auth: AuthenticatedRequestContext, lessonId: string) {
  const lesson = await getLessonById(lessonId);
  await authorizeModuleAccess(auth, lesson.module_id);
  return lesson;
}

async function authorizeExerciseAccess(auth: AuthenticatedRequestContext, exerciseId: string) {
  const exercise = await getExerciseById(exerciseId);
  await authorizeModuleAccess(auth, exercise.module_id);
  return exercise;
}

async function resolveExercisePlacement(
  auth: AuthenticatedRequestContext,
  input: {
    afterLessonId?: string | null;
    moduleId?: string;
  }
) {
  if (input.afterLessonId) {
    const lesson = await authorizeLessonAccess(auth, input.afterLessonId);

    return {
      moduleId: lesson.module_id,
      afterLessonId: lesson.id,
    };
  }

  if (input.moduleId) {
    const module = await authorizeModuleAccess(auth, input.moduleId);

    return {
      moduleId: module.id,
      afterLessonId: null,
    };
  }

  throw new AppError(
    400,
    "Provide either afterLessonId or moduleId when saving an exercise.",
    "EXERCISE_TARGET_REQUIRED"
  );
}

export async function listModuleExercises(
  auth: AuthenticatedRequestContext,
  moduleId: string
) {
  await authorizeModuleAccess(auth, moduleId);

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("*")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: true });

  if (error) {
    throw toServiceError(500, "EXERCISES_LIST_FAILED", "Unable to list exercises", error);
  }

  return (data ?? []) as ExerciseRow[];
}

export async function createExercise(
  auth: AuthenticatedRequestContext,
  input: {
    afterLessonId?: string;
    moduleId?: string;
    type: ExerciseType;
    title: string;
    description?: string | null;
    content: ExerciseContent;
  }
) {
  const target = await resolveExercisePlacement(auth, {
    afterLessonId: input.afterLessonId,
    moduleId: input.moduleId,
  });

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .insert({
      module_id: target.moduleId,
      after_lesson_id: target.afterLessonId,
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw toServiceError(500, "EXERCISE_CREATE_FAILED", "Unable to create exercise", error);
  }

  return data as ExerciseRow;
}

export async function updateExerciseById(
  auth: AuthenticatedRequestContext,
  exerciseId: string,
  input: {
    afterLessonId?: string | null;
    moduleId?: string;
    type?: ExerciseType;
    title?: string;
    description?: string | null;
    content?: ExerciseContent;
  }
) {
  const existingExercise = await authorizeExerciseAccess(auth, exerciseId);
  const payload: Record<string, unknown> = {};

  if (
    input.type !== undefined &&
    input.type !== existingExercise.type &&
    input.content === undefined
  ) {
    throw new AppError(
      400,
      "Updating the exercise type requires updated content.",
      "EXERCISE_CONTENT_REQUIRED"
    );
  }

  if (input.afterLessonId !== undefined) {
    if (input.afterLessonId) {
      const lesson = await authorizeLessonAccess(auth, input.afterLessonId);
      payload.after_lesson_id = lesson.id;
      payload.module_id = lesson.module_id;
    } else {
      const targetModuleId = input.moduleId ?? existingExercise.module_id;
      const module = await authorizeModuleAccess(auth, targetModuleId);
      payload.after_lesson_id = null;
      payload.module_id = module.id;
    }
  } else if (input.moduleId !== undefined) {
    const module = await authorizeModuleAccess(auth, input.moduleId);
    payload.after_lesson_id = null;
    payload.module_id = module.id;
  }

  if (input.type !== undefined) {
    payload.type = input.type;
  }

  if (input.title !== undefined) {
    payload.title = input.title.trim();
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }

  if (input.content !== undefined) {
    payload.content = input.content;
    payload.type = input.type ?? (input.content.type as ExerciseType);
  }

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .update(payload)
    .eq("id", exerciseId)
    .select("*")
    .single();

  if (error) {
    throw toServiceError(500, "EXERCISE_UPDATE_FAILED", "Unable to update exercise", error);
  }

  return data as ExerciseRow;
}

export async function deleteExerciseById(
  auth: AuthenticatedRequestContext,
  exerciseId: string
) {
  await authorizeExerciseAccess(auth, exerciseId);

  const { error } = await supabaseAdmin.from("exercises").delete().eq("id", exerciseId);

  if (error) {
    throw toServiceError(500, "EXERCISE_DELETE_FAILED", "Unable to delete exercise", error);
  }
}
