import { Request, Response } from "express";
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
import { getContentForAI } from "../services/getContentForAI";

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

  // мінімальна перевірка якості
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

export async function generateTestQuestions(req: Request, res: Response) {
  try {
    const {
      afterLessonId,
      moduleId,
      questionCount: requestedQuestionCount,
      generationMode: requestedGenerationMode,
    } = req.body;

    const { text, questionCount } = await getContentForAI({
      afterLessonId,
      moduleId,
      questionCount:
        typeof requestedQuestionCount === "number" && Number.isFinite(requestedQuestionCount)
          ? requestedQuestionCount
          : undefined,
    });

    if (!text.trim() || questionCount <= 0) {
      return res.status(400).json({
        error: "Content is too short for generating questions",
      });
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

    return res.status(500).json({
      error: "Failed to generate questions",
    });
  }
}

export async function generateExerciseDraft(req: Request, res: Response) {
  try {
    const {
      afterLessonId,
      moduleId,
      type: requestedType,
      difficulties: requestedDifficulties,
      count: requestedCount,
    } = req.body;

    const exerciseType = normalizeExerciseType(requestedType);
    const difficulties = normalizeExerciseDifficulties(requestedDifficulties);
    const requestedExerciseCount = normalizeExerciseCount(requestedCount);

    if (!exerciseType) {
      return res.status(400).json({
        error: "Exercise type must be drag_drop_code or write_code",
      });
    }

    if (!difficulties) {
      return res.status(400).json({
        error: "Difficulties must be a non-empty array of easy, medium, or hard",
      });
    }

    if (!requestedExerciseCount) {
      return res.status(400).json({
        error: "Count must be a positive integer",
      });
    }

    const { text } = await getContentForAI({
      afterLessonId,
      moduleId,
    });

    if (!text.trim()) {
      return res.status(400).json({
        error: "Content is too short for generating exercise",
      });
    }

    const allocations = distributeExerciseCount(difficulties, requestedExerciseCount);
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
      return res.status(500).json({
        error: "Failed to generate exercise",
      });
    }

    return res.json({
      exercises,
      content: stripDifficulty(firstExercise),
    });
  } catch (error) {
    console.error("[AI] Final error (exercise):", error);

    return res.status(500).json({
      error: "Failed to generate exercise",
    });
  }
}
