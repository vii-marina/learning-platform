/** AI generation requests. Rate-limited and ownership-checked on the backend. */

import { authorizedBackendRequest } from "../../../auth/api/backendClient";
import type { GenerateTestQuestionsResponse, GenerateTestQuestionsInput, GenerateExerciseResponse, GenerateExerciseInput, ExerciseGenerationLimitInput, ExerciseGenerationLimitResponse } from "./internal";


// AI generation — backend-mediated.
export async function generateTestQuestionsWithAi(
  input: GenerateTestQuestionsInput
) {
  const response = await authorizedBackendRequest<GenerateTestQuestionsResponse>(
    "/api/ai/generate-test-questions",
    {
      method: "POST",
      body: input,
    }
  );

  return response.questions;
}

export async function generateExercisesWithAi(input: GenerateExerciseInput) {
  const response = await authorizedBackendRequest<GenerateExerciseResponse>(
    "/api/ai/generate-exercise",
    {
      method: "POST",
      body: input,
    }
  );

  return response;
}

export async function getExerciseAiGenerationLimit(
  input: ExerciseGenerationLimitInput
) {
  return authorizedBackendRequest<ExerciseGenerationLimitResponse>(
    "/api/ai/exercise-generation-limit",
    {
      method: "POST",
      body: input,
    }
  );
}

export async function generateExerciseWithAi(input: GenerateExerciseInput) {
  const response = await generateExercisesWithAi(input);

  if (response.content) {
    return response.content;
  }

  const firstExercise = response.exercises?.[0];

  if (firstExercise) {
    return firstExercise;
  }

  throw new Error("AI did not return any exercises.");
}
