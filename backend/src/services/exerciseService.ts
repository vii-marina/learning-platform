/**
 * Exercise authoring. Ownership checks and placement rules live in `exercise/access`.
 */

import { AppError, toServiceError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import type { AuthenticatedRequestContext } from "../types/auth";
import {
  authorizeExerciseAccess,
  authorizeLessonAccess,
  authorizeModuleAccess,
  getNextExercisePosition,
  getExerciseContentByExerciseId,
  listExerciseContentByExerciseIds,
  mapExerciseRow,
  resolveExercisePlacement,
  type ExerciseBaseRow,
  type ExerciseContentRow,
  type ExerciseContentValue,
  type ExerciseType,
} from "./exercise/access";


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
