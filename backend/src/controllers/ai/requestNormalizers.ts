/**
 * Coercion of AI request parameters into the shapes the generators expect.
 *
 * These sit between Zod and the generator: Zod proves the payload is well-formed, and
 * these decide what an out-of-range or absent value should become. Pure, so the
 * distribution and clamping rules can be checked directly.
 */

import type { Response } from "express";
import type {
  ExerciseDifficulty,
  GeneratedExerciseContent,
  GeneratedExerciseType,
} from "../../services/aiExerciseGenerator";
import type { AiQuestionGenerationMode } from "../../services/aiQuestionGenerator";

export function normalizeGenerationMode(value: unknown): AiQuestionGenerationMode {
  return value === "true_false" ||
    value === "single_choice" ||
    value === "multiple_choice" ||
    value === "mixed"
    ? value
    : "single_choice";
}

export function normalizeExerciseType(value: unknown): GeneratedExerciseType | null {
  return value === "drag_drop_code" || value === "write_code" ? value : null;
}

export function normalizeExerciseDifficulty(value: unknown): ExerciseDifficulty | null {
  return value === "easy" || value === "medium" || value === "hard" ? value : null;
}

export function normalizeExerciseDifficulties(value: unknown): ExerciseDifficulty[] | null {
  if (value === undefined) {
    return ["medium"];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const seen = new Set<ExerciseDifficulty>();
  const difficulties: ExerciseDifficulty[] = [];

  for (const entry of value) {
    const difficulty = normalizeExerciseDifficulty(entry);

    if (!difficulty || seen.has(difficulty)) {
      continue;
    }

    seen.add(difficulty);
    difficulties.push(difficulty);
  }

  return difficulties.length > 0 ? difficulties : null;
}

export function sendAiError(
  res: Response,
  status: number,
  message: string,
  code: string
) {
  return res.status(status).json({
    message,
    error: message,
    code,
  });
}

export function normalizeExerciseCount(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);

  return normalized > 0 ? normalized : null;
}

export function distributeExerciseCount(
  difficulties: ExerciseDifficulty[],
  count: number
) {
  const baseCount = Math.floor(count / difficulties.length);
  const remainder = count % difficulties.length;

  return difficulties
    .map((difficulty, index) => ({
      difficulty,
      count: baseCount + (index < remainder ? 1 : 0),
    }))
    .filter((allocation) => allocation.count > 0);
}

export type GeneratedExerciseDraft = GeneratedExerciseContent & {
  difficulty: ExerciseDifficulty;
};

export function attachDifficulty(
  content: GeneratedExerciseContent,
  difficulty: ExerciseDifficulty
): GeneratedExerciseDraft {
  return {
    ...content,
    difficulty,
  };
}

export function stripDifficulty(
  exercise: GeneratedExerciseDraft
): GeneratedExerciseContent {
  const { difficulty: _difficulty, ...content } = exercise;
  return content;
}

