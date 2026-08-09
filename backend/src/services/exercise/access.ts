/**
 * Row readers, ownership checks and placement rules for exercises.
 *
 * An exercise is anchored either to a module or to a position after a lesson, and both
 * routes must resolve to a course the caller owns. `resolveExercisePlacement` is where
 * that is decided; everything above it is the plumbing it needs.
 */

import { AppError, toServiceError } from "../../lib/appError";
import { supabaseAdmin } from "../../lib/supabase";
import type { AuthenticatedRequestContext } from "../../types/auth";

export type ExerciseType = "drag_drop_code" | "write_code";

export type CourseOwnershipRow = {
  id: string;
  teacher_id: string | null;
};

export type ModuleRow = {
  id: string;
  course_id: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
};

export type ExerciseContentValue = {
  type: ExerciseType;
} & Record<string, unknown>;

export type ExerciseBaseRow = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: ExerciseType;
  title: string;
  position: number | null;
  created_at: string;
};

export type ExerciseContentRow = {
  id: string;
  exercise_id: string;
  content: ExerciseContentValue;
  created_at: string;
};

export type ExerciseRow = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: ExerciseType;
  title: string;
  description: string | null;
  content: ExerciseContentValue;
  created_at: string;
  updated_at: string;
};

export function ensureTeacherOrAdmin(auth: AuthenticatedRequestContext) {
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

export function mapExerciseRow(
  exercise: ExerciseBaseRow,
  contentRow: ExerciseContentRow | null
): ExerciseRow {
  return {
    id: exercise.id,
    module_id: exercise.module_id,
    after_lesson_id: exercise.after_lesson_id,
    type: exercise.type,
    title: exercise.title,
    description: null,
    content: contentRow?.content ?? ({ type: exercise.type } as ExerciseContentValue),
    created_at: exercise.created_at,
    updated_at: contentRow?.created_at ?? exercise.created_at,
  };
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

export async function getLessonById(lessonId: string) {
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

export async function getExerciseBaseById(exerciseId: string) {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("id,module_id,after_lesson_id,type,title,position,created_at")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "EXERCISE_FETCH_FAILED", "Unable to load exercise", error);
  }

  if (!data) {
    throw new AppError(404, "Exercise was not found.", "EXERCISE_NOT_FOUND");
  }

  return data as ExerciseBaseRow;
}

export async function getExerciseContentByExerciseId(exerciseId: string) {
  const { data, error } = await supabaseAdmin
    .from("exercise_content")
    .select("id,exercise_id,content,created_at")
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "EXERCISE_CONTENT_FETCH_FAILED",
      "Unable to load exercise content",
      error
    );
  }

  return (data as ExerciseContentRow | null) ?? null;
}

export async function listExerciseContentByExerciseIds(exerciseIds: string[]) {
  if (exerciseIds.length === 0) {
    return new Map<string, ExerciseContentRow>();
  }

  const { data, error } = await supabaseAdmin
    .from("exercise_content")
    .select("id,exercise_id,content,created_at")
    .in("exercise_id", exerciseIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw toServiceError(
      500,
      "EXERCISE_CONTENT_LIST_FAILED",
      "Unable to list exercise content",
      error
    );
  }

  const rows = (data ?? []) as ExerciseContentRow[];
  const contentByExerciseId = new Map<string, ExerciseContentRow>();

  rows.forEach((row) => {
    if (!contentByExerciseId.has(row.exercise_id)) {
      contentByExerciseId.set(row.exercise_id, row);
    }
  });

  return contentByExerciseId;
}

export async function getNextExercisePosition(moduleId: string) {
  const { data, error } = await supabaseAdmin
    .from("exercises")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "EXERCISE_POSITION_FAILED",
      "Unable to compute next exercise position",
      error
    );
  }

  return (data?.position ?? 0) + 1;
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

export async function authorizeLessonAccess(auth: AuthenticatedRequestContext, lessonId: string) {
  const lesson = await getLessonById(lessonId);
  await authorizeModuleAccess(auth, lesson.module_id);
  return lesson;
}

export async function authorizeExerciseAccess(auth: AuthenticatedRequestContext, exerciseId: string) {
  const exercise = await getExerciseBaseById(exerciseId);
  await authorizeModuleAccess(auth, exercise.module_id);
  return exercise;
}

export async function resolveExercisePlacement(
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
