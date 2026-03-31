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

type ExerciseContentValue = {
  type: ExerciseType;
} & Record<string, unknown>;

type ExerciseBaseRow = {
  id: string;
  module_id: string;
  after_lesson_id: string | null;
  type: ExerciseType;
  title: string;
  position: number | null;
  created_at: string;
};

type ExerciseContentRow = {
  id: string;
  exercise_id: string;
  content: ExerciseContentValue;
  created_at: string;
};

type ExerciseRow = {
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

function mapExerciseRow(
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

async function getExerciseBaseById(exerciseId: string) {
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

async function getExerciseContentByExerciseId(exerciseId: string) {
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

async function listExerciseContentByExerciseIds(exerciseIds: string[]) {
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

async function getNextExercisePosition(moduleId: string) {
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
  const exercise = await getExerciseBaseById(exerciseId);
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
    .select("id,module_id,after_lesson_id,type,title,position,created_at")
    .eq("module_id", moduleId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw toServiceError(500, "EXERCISES_LIST_FAILED", "Unable to list exercises", error);
  }

  const exercises = (data ?? []) as ExerciseBaseRow[];
  const contentByExerciseId = await listExerciseContentByExerciseIds(
    exercises.map((exercise) => exercise.id)
  );

  return exercises.map((exercise) =>
    mapExerciseRow(exercise, contentByExerciseId.get(exercise.id) ?? null)
  );
}

export async function createExercise(
  auth: AuthenticatedRequestContext,
  input: {
    afterLessonId?: string;
    moduleId?: string;
    type: ExerciseType;
    title: string;
    description?: string | null;
    content: ExerciseContentValue;
  }
) {
  const target = await resolveExercisePlacement(auth, {
    afterLessonId: input.afterLessonId,
    moduleId: input.moduleId,
  });
  const position = await getNextExercisePosition(target.moduleId);

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .insert({
      module_id: target.moduleId,
      after_lesson_id: target.afterLessonId,
      type: input.type,
      title: input.title.trim(),
      position,
    })
    .select("id,module_id,after_lesson_id,type,title,position,created_at")
    .single();

  if (error) {
    throw toServiceError(500, "EXERCISE_CREATE_FAILED", "Unable to create exercise", error);
  }

  const exercise = data as ExerciseBaseRow;

  const { data: contentData, error: contentError } = await supabaseAdmin
    .from("exercise_content")
    .insert({
      exercise_id: exercise.id,
      content: input.content,
    })
    .select("id,exercise_id,content,created_at")
    .single();

  if (contentError) {
    await supabaseAdmin.from("exercises").delete().eq("id", exercise.id);
    throw toServiceError(
      500,
      "EXERCISE_CONTENT_CREATE_FAILED",
      "Unable to save exercise content",
      contentError
    );
  }

  return mapExerciseRow(exercise, contentData as ExerciseContentRow);
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
    content?: ExerciseContentValue;
  }
) {
  const existingExercise = await authorizeExerciseAccess(auth, exerciseId);
  const basePayload: Record<string, unknown> = {};
  let targetModuleId = existingExercise.module_id;

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
      basePayload.after_lesson_id = lesson.id;
      basePayload.module_id = lesson.module_id;
      targetModuleId = lesson.module_id;
    } else {
      const targetModule = await authorizeModuleAccess(
        auth,
        input.moduleId ?? existingExercise.module_id
      );
      basePayload.after_lesson_id = null;
      basePayload.module_id = targetModule.id;
      targetModuleId = targetModule.id;
    }
  } else if (input.moduleId !== undefined) {
    const targetModule = await authorizeModuleAccess(auth, input.moduleId);
    basePayload.after_lesson_id = null;
    basePayload.module_id = targetModule.id;
    targetModuleId = targetModule.id;
  }

  if (input.title !== undefined) {
    basePayload.title = input.title.trim();
  }

  if (input.content !== undefined) {
    basePayload.type = input.type ?? (input.content.type as ExerciseType);
  } else if (input.type !== undefined) {
    basePayload.type = input.type;
  }

  if (targetModuleId !== existingExercise.module_id) {
    basePayload.position = await getNextExercisePosition(targetModuleId);
  }

  let exercise = existingExercise;

  if (Object.keys(basePayload).length > 0) {
    const { data, error } = await supabaseAdmin
      .from("exercises")
      .update(basePayload)
      .eq("id", exerciseId)
      .select("id,module_id,after_lesson_id,type,title,position,created_at")
      .single();

    if (error) {
      throw toServiceError(500, "EXERCISE_UPDATE_FAILED", "Unable to update exercise", error);
    }

    exercise = data as ExerciseBaseRow;
  }

  let contentRow = await getExerciseContentByExerciseId(exerciseId);

  if (input.content !== undefined) {
    if (contentRow) {
      const { data, error } = await supabaseAdmin
        .from("exercise_content")
        .update({
          content: input.content,
        })
        .eq("id", contentRow.id)
        .select("id,exercise_id,content,created_at")
        .single();

      if (error) {
        throw toServiceError(
          500,
          "EXERCISE_CONTENT_UPDATE_FAILED",
          "Unable to update exercise content",
          error
        );
      }

      contentRow = data as ExerciseContentRow;
    } else {
      const { data, error } = await supabaseAdmin
        .from("exercise_content")
        .insert({
          exercise_id: exerciseId,
          content: input.content,
        })
        .select("id,exercise_id,content,created_at")
        .single();

      if (error) {
        throw toServiceError(
          500,
          "EXERCISE_CONTENT_CREATE_FAILED",
          "Unable to save exercise content",
          error
        );
      }

      contentRow = data as ExerciseContentRow;
    }
  }

  return mapExerciseRow(exercise, contentRow);
}

export async function deleteExerciseById(
  auth: AuthenticatedRequestContext,
  exerciseId: string
) {
  await authorizeExerciseAccess(auth, exerciseId);

  const { error: contentError } = await supabaseAdmin
    .from("exercise_content")
    .delete()
    .eq("exercise_id", exerciseId);

  if (contentError) {
    throw toServiceError(
      500,
      "EXERCISE_CONTENT_DELETE_FAILED",
      "Unable to delete exercise content",
      contentError
    );
  }

  const { error } = await supabaseAdmin.from("exercises").delete().eq("id", exerciseId);

  if (error) {
    throw toServiceError(500, "EXERCISE_DELETE_FAILED", "Unable to delete exercise", error);
  }
}
