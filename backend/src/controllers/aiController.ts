import { Request, Response } from "express";
import {
  generateExerciseFromLesson,
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
  type: GeneratedExerciseType
) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[AI] Generating exercise (attempt ${attempt})`);

      const exercise = await generateExerciseFromLesson(text, type);

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
    const { afterLessonId, moduleId, type: requestedType } = req.body;

    const exerciseType = normalizeExerciseType(requestedType);

    if (!exerciseType) {
      return res.status(400).json({
        error: "Exercise type must be drag_drop_code or write_code",
      });
    }

    const { text, questionCount } = await getContentForAI({
      afterLessonId,
      moduleId,
      questionCount: 1,
    });

    if (!text.trim() || questionCount <= 0) {
      return res.status(400).json({
        error: "Content is too short for generating exercise",
      });
    }

    const exercise = await generateExerciseWithRetry(text, exerciseType);

    return res.json({
      content: exercise,
    });
  } catch (error) {
    console.error("[AI] Final error (exercise):", error);

    return res.status(500).json({
      error: "Failed to generate exercise",
    });
  }
}