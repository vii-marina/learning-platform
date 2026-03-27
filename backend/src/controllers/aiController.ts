import { Request, Response } from "express";
import { generateQuestionsFromLesson } from "../services/aiQuestionGenerator";
import { getContentForAI } from "../services/getContentForAI";

export async function generateTestQuestions(req: Request, res: Response) {
  try {
    const { afterLessonId, moduleId } = req.body;

    const { text, questionCount } = await getContentForAI({
      afterLessonId,
      moduleId,
    });

    if (!text || text.length < 50) {
      return res.status(400).json({
        error: "Lesson content is too short",
      });
    }

    const questions = await generateQuestionsFromLesson(
      text,
      questionCount
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
