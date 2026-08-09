/**
 * AI generation endpoints.
 *
 * Parameter coercion lives in `ai/requestNormalizers`; retry and concurrency policy in
 * `ai/generationRetries`. What remains here is authorisation, orchestration and the
 * response shape.
 */

import { Request, Response } from "express";
import { AppError } from "../lib/appError";
import { logger } from "../lib/logger";
import {
  AI_EXERCISE_CONCURRENCY,
  generateExerciseWithRetry,
  generateQuestionsWithRetry,
  mapWithConcurrency,
} from "./ai/generationRetries";
import {
  attachDifficulty,
  distributeExerciseCount,
  normalizeExerciseCount,
  normalizeExerciseDifficulties,
  normalizeExerciseType,
  normalizeGenerationMode,
  sendAiError,
  stripDifficulty,
  type GeneratedExerciseDraft,
} from "./ai/requestNormalizers";
import {
  authorizeLessonAccess,
  authorizeModuleAccess,
} from "../services/courseAuthoringService";
import {
  detectMaxDifficulty,
  filterDifficulties,
} from "../services/exerciseDifficulty";
import { getContentForAI } from "../services/getContentForAI";
import type { AuthenticatedRequestContext } from "../types/auth";
import {
  exerciseGenerationLimitSchema,
  generateExerciseSchema,
  generateTestQuestionsSchema,
} from "../validators/aiSchemas";

function getAuth(req: Request): AuthenticatedRequestContext {
  if (!req.auth) {
    throw new AppError(401, "Authentication is required.", "AUTH_REQUIRED");
  }
  return req.auth;
}

// R11: a teacher may only generate from content they own (admins bypass).
// Mirrors getContentForAI's target priority: afterLessonId first, then moduleId.
async function authorizeAiTarget(
  auth: AuthenticatedRequestContext,
  target: { afterLessonId?: string; moduleId?: string }
) {
  if (target.afterLessonId) {
    await authorizeLessonAccess(auth, target.afterLessonId);
    return;
  }
  if (target.moduleId) {
    await authorizeModuleAccess(auth, target.moduleId);
    return;
  }
  throw new AppError(
    400,
    "Provide either afterLessonId or moduleId.",
    "AI_TARGET_MISSING"
  );
}


export async function getExerciseGenerationLimit(req: Request, res: Response) {
  const { afterLessonId, moduleId } = exerciseGenerationLimitSchema.parse(req.body);

  await authorizeAiTarget(getAuth(req), { afterLessonId, moduleId });

  try {
    const { text, questionCount } = await getContentForAI({
      afterLessonId,
      moduleId,
    });

    if (!text.trim() || questionCount <= 0) {
      return res.json({
        maxCount: 0,
        maxDifficulty: "easy",
      });
    }

    const maxDifficulty = detectMaxDifficulty(text);

    return res.json({
      maxCount: questionCount,
      maxDifficulty,
    });
  } catch (error) {
    logger.error("AI exercise-limit request failed", {
      code: "AI_EXERCISE_LIMIT_FAILED",
      error,
    });

    return sendAiError(
      res,
      500,
      "Failed to resolve exercise generation limit",
      "AI_EXERCISE_LIMIT_FAILED"
    );
  }
}

export async function generateTestQuestions(req: Request, res: Response) {
  const {
    afterLessonId,
    moduleId,
    questionCount: requestedQuestionCount,
    generationMode: requestedGenerationMode,
  } = generateTestQuestionsSchema.parse(req.body);

  await authorizeAiTarget(getAuth(req), { afterLessonId, moduleId });

  try {
    const { text, questionCount } = await getContentForAI({
      afterLessonId,
      moduleId,
      questionCount:
        typeof requestedQuestionCount === "number" && Number.isFinite(requestedQuestionCount)
          ? requestedQuestionCount
          : undefined,
    });

    if (!text.trim() || questionCount <= 0) {
      return sendAiError(
        res,
        400,
        "Content is too short for generating questions",
        "AI_QUESTION_CONTENT_TOO_SHORT"
      );
    }

    const mode = normalizeGenerationMode(requestedGenerationMode);

    const questions = await generateQuestionsWithRetry(
      text,
      questionCount,
      mode
    );

    return res.json({
      questions,
      requestedCount: questionCount,
      generatedCount: questions.length,
    });
  } catch (error) {
    logger.error("AI question generation failed", {
      code: "AI_QUESTION_GENERATION_FAILED",
      error,
    });

    return sendAiError(
      res,
      500,
      "Failed to generate questions",
      "AI_QUESTION_GENERATION_FAILED"
    );
  }
}

export async function generateExerciseDraft(req: Request, res: Response) {
  const {
    afterLessonId,
    moduleId,
    type: requestedType,
    difficulties: requestedDifficulties,
    count: requestedCount,
  } = generateExerciseSchema.parse(req.body);

  await authorizeAiTarget(getAuth(req), { afterLessonId, moduleId });

  try {
    const exerciseType = normalizeExerciseType(requestedType);
    const difficulties = normalizeExerciseDifficulties(requestedDifficulties);
    const requestedExerciseCount = normalizeExerciseCount(requestedCount);

    if (!exerciseType) {
      return sendAiError(
        res,
        400,
        "Exercise type must be drag_drop_code or write_code",
        "AI_EXERCISE_TYPE_INVALID"
      );
    }

    if (!difficulties) {
      return sendAiError(
        res,
        400,
        "Difficulties must be a non-empty array of easy, medium, or hard",
        "AI_EXERCISE_DIFFICULTIES_INVALID"
      );
    }

    if (!requestedExerciseCount) {
      return sendAiError(
        res,
        400,
        "Count must be a positive integer",
        "AI_EXERCISE_COUNT_INVALID"
      );
    }

    const { text } = await getContentForAI({
      afterLessonId,
      moduleId,
    });

    if (!text.trim()) {
      return sendAiError(
        res,
        400,
        "Content is too short for generating exercise",
        "AI_EXERCISE_CONTENT_TOO_SHORT"
      );
    }

    const maxDifficulty = detectMaxDifficulty(text);
    const allowedDifficulties = filterDifficulties(difficulties, maxDifficulty);

    logger.debug("Exercise difficulty filter", {
      requested: difficulties,
      max: maxDifficulty,
      final: allowedDifficulties,
    });

    const allocations = distributeExerciseCount(
      allowedDifficulties,
      requestedExerciseCount
    );

    // One job per exercise, generated concurrently; failed jobs drop out
    // instead of failing the whole request.
    const jobs = allocations.flatMap((allocation) =>
      Array.from({ length: allocation.count }, () => allocation.difficulty)
    );

    const results = await mapWithConcurrency(
      jobs,
      AI_EXERCISE_CONCURRENCY,
      async (difficulty) => {
        const exercise = await generateExerciseWithRetry(
          text,
          exerciseType,
          difficulty
        );

        return attachDifficulty(exercise, difficulty);
      }
    );

    const exercises = results.filter(
      (exercise): exercise is GeneratedExerciseDraft => exercise !== null
    );

    const firstExercise = exercises[0];

    if (!firstExercise) {
      return sendAiError(
        res,
        500,
        "Failed to generate exercise",
        "AI_EXERCISE_GENERATION_FAILED"
      );
    }

    return res.json({
      maxDifficulty,
      exercises,
      content: stripDifficulty(firstExercise),
      requestedCount: jobs.length,
      generatedCount: exercises.length,
    });
  } catch (error) {
    logger.error("AI exercise generation failed", {
      code: "AI_EXERCISE_GENERATION_FAILED",
      error,
    });

    return sendAiError(
      res,
      500,
      "Failed to generate exercise",
      "AI_EXERCISE_GENERATION_FAILED"
    );
  }
}
