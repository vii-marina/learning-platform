import { Request, Response } from "express";
import {
  generateQuestionsFromLesson,
  type AiQuestionGenerationMode,
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
        error: "Lesson or module content is too short",
      });
    }

    const questions = await generateQuestionsFromLesson(
      text,
      questionCount,
      normalizeGenerationMode(requestedGenerationMode)
    );

    return res.json({
      questions,
    });
  } catch (error) {
    console.error("AI generation error:", error);

    return res.status(500).json({
      error: "Failed to generate questions",
    });
  }
}
