import { z } from "zod";

const uuid = z.string().uuid("Must be a valid UUID.");

const hasTarget = (value: { afterLessonId?: string; moduleId?: string }) =>
  Boolean(value.afterLessonId) || Boolean(value.moduleId);

const targetRefinement = {
  message: "Provide either afterLessonId or moduleId.",
  path: ["afterLessonId"] as PropertyKey[],
};

export const generateTestQuestionsSchema = z
  .object({
    afterLessonId: uuid.optional(),
    moduleId: uuid.optional(),
    questionCount: z.number().int().positive().max(50).optional(),
    generationMode: z
      .enum(["true_false", "single_choice", "multiple_choice", "mixed"])
      .optional(),
  })
  .refine(hasTarget, targetRefinement);

export const generateExerciseSchema = z
  .object({
    afterLessonId: uuid.optional(),
    moduleId: uuid.optional(),
    type: z.enum(["drag_drop_code", "write_code"]),
    difficulties: z.array(z.enum(["easy", "medium", "hard"])).min(1).optional(),
    count: z.number().int().positive().max(20).optional(),
  })
  .refine(hasTarget, targetRefinement);

export const exerciseGenerationLimitSchema = z
  .object({
    afterLessonId: uuid.optional(),
    moduleId: uuid.optional(),
  })
  .refine(hasTarget, targetRefinement);
