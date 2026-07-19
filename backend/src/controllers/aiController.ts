import { Request, Response } from "express";
import { AppError } from "../lib/appError";
import {
  type ExerciseDifficulty,
  generateExerciseFromLesson,
  type GeneratedExerciseContent,
  type GeneratedExerciseType,
} from "../services/aiExerciseGenerator";
import {
  generateQuestionsFromLesson,
  type AiQuestionGenerationMode,
  type GeneratedQuestion,
} from "../services/aiQuestionGenerator";
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

function normalizeGenerationMode(value: unknown): AiQuestionGenerationMode {
  return value === "true_false" ||
    value === "single_choice" ||
    value === "multiple_choice" ||
    value === "mixed"
    ? value
    : "single_choice";
}

function normalizeExerciseType(value: unknown): GeneratedExerciseType | null {
  return value === "drag_drop_code" || value === "write_code" ? value : null;
}

function normalizeExerciseDifficulty(value: unknown): ExerciseDifficulty | null {
  return value === "easy" || value === "medium" || value === "hard" ? value : null;
}

function normalizeExerciseDifficulties(value: unknown): ExerciseDifficulty[] | null {
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

function sendAiError(
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

function normalizeExerciseCount(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);

  return normalized > 0 ? normalized : null;
}

function distributeExerciseCount(
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

type GeneratedExerciseDraft = GeneratedExerciseContent & {
  difficulty: ExerciseDifficulty;
};

function attachDifficulty(
  content: GeneratedExerciseContent,
  difficulty: ExerciseDifficulty
): GeneratedExerciseDraft {
  return {
    ...content,
    difficulty,
  };
}

function stripDifficulty(
  exercise: GeneratedExerciseDraft
): GeneratedExerciseContent {
  const { difficulty: _difficulty, ...content } = exercise;
  return content;
}

function validateQuestions(questions: GeneratedQuestion[]) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return false;
  }

  const uniqueTexts = new Set(
    questions.map((q) => q.question_text.toLowerCase().trim())
  );

  // minimal quality check
  if (uniqueTexts.size < Math.ceil(questions.length * 0.7)) {
    return false;
  }

  return true;
}

async function generateQuestionsWithRetry(
  text: string,
  questionCount: number,
  mode: AiQuestionGenerationMode
): Promise<GeneratedQuestion[]> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[AI] Generating questions (attempt ${attempt})`);

      const questions = await generateQuestionsFromLesson(
        text,
        questionCount,
        mode
      );

      if (validateQuestions(questions)) {
        return questions;
      }

      console.warn("[AI] Low quality questions, retrying...");
    } catch (err) {
      console.error("[AI] Generation error:", err);
    }
  }

  throw new Error("AI failed to generate valid questions after retries");
}

async function generateExerciseWithRetry(
  text: string,
  type: GeneratedExerciseType,
  difficulty: ExerciseDifficulty
) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[AI] Generating ${difficulty} exercise (attempt ${attempt})`
      );

      const exercise = await generateExerciseFromLesson(
        text,
        type,
        difficulty
      );

      if (exercise && exercise.question.length > 10) {
        return exercise;
      }

      console.warn("[AI] Low quality exercise, retrying...");
    } catch (err) {
      console.error("[AI] Exercise generation error:", err);
    }
  }

  throw new Error("AI failed to generate valid exercise after retries");
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
    console.error("[AI] Final error (exercise limit):", error);

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
    });
  } catch (error) {
    console.error("[AI] Final error (questions):", error);

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

    console.log("[AI] Exercise difficulty filter:", {
      requested: difficulties,
      max: maxDifficulty,
      final: allowedDifficulties,
    });

    const allocations = distributeExerciseCount(
      allowedDifficulties,
      requestedExerciseCount
    );
    const exercises: GeneratedExerciseDraft[] = [];

    for (const allocation of allocations) {
      for (let index = 0; index < allocation.count; index++) {
        const exercise = await generateExerciseWithRetry(
          text,
          exerciseType,
          allocation.difficulty
        );

        exercises.push(attachDifficulty(exercise, allocation.difficulty));
      }
    }

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
    });
  } catch (error) {
    console.error("[AI] Final error (exercise):", error);

    return sendAiError(
      res,
      500,
      "Failed to generate exercise",
      "AI_EXERCISE_GENERATION_FAILED"
    );
  }
}
