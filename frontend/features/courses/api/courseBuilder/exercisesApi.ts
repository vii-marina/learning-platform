/** Exercises. Fully backend-mediated in both directions. */

import { dedupeRequest } from "../../../../lib/requestDedup";
import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import type { ExerciseResponse, ExercisesResponse } from "./internal";
import type { CreateExerciseInput, LessonBlock, UpdateExerciseInput } from "../types";

// EXERCISES — already backend-mediated.
export async function listExercisesByModule(moduleId: string) {
  return dedupeRequest(`exercises:module:${moduleId}`, async () => {
    const response = await authorizedBackendRequest<ExercisesResponse>(
      `/api/modules/${moduleId}/exercises`
    );

    return response.exercises;
  });
}

export async function createExercise(input: CreateExerciseInput) {
  const response = await authorizedBackendRequest<ExerciseResponse>("/api/exercises", {
    method: "POST",
    body: {
      afterLessonId: input.afterLessonId,
      moduleId: input.moduleId,
      type: input.type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content,
    },
  });

  return response.exercise;
}

export async function updateExercise(exerciseId: string, input: UpdateExerciseInput) {
  const response = await authorizedBackendRequest<ExerciseResponse>(
    `/api/exercises/${exerciseId}`,
    {
      method: "PATCH",
      body: {
        afterLessonId: input.afterLessonId,
        moduleId: input.moduleId,
        type: input.type,
        title: typeof input.title === "string" ? input.title.trim() : input.title,
        description:
          typeof input.description === "string"
            ? input.description.trim() || null
            : input.description,
        content: input.content,
      },
    }
  );

  return response.exercise;
}

export async function deleteExercise(exerciseId: string) {
  await authorizedBackendRequest<void>(`/api/exercises/${exerciseId}`, {
    method: "DELETE",
  });
}

export async function swapLessonBlockOrder(first: LessonBlock, second: LessonBlock) {
  await authorizedBackendRequest<void>("/authoring/reorder/lesson-blocks", {
    method: "POST",
    body: { firstId: first.id, secondId: second.id },
  });
}
