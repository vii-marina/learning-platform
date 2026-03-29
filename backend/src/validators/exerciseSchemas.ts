import { z } from "zod";

const optionalTrimmedString = z.string().transform((value) => value.trim()).optional();
const optionalNullableTrimmedString = z
  .union([z.string(), z.null()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .optional();

const exerciseTypeSchema = z.enum(["drag_drop_code", "write_code"]);

const dragDropCodeContentSchema = z
  .object({
    type: z.literal("drag_drop_code"),
    question: z.string().trim().min(1, "Question is required."),
    code_template: z.string().min(1, "Code template is required."),
    tokens: z.array(z.string().trim().min(1, "Token cannot be empty.")).min(1),
    correct_answer: z
      .array(z.string().trim().min(1, "Correct answer token cannot be empty."))
      .min(1),
  })
  .superRefine((value, context) => {
    const tokens = new Set(value.tokens);

    value.correct_answer.forEach((token, index) => {
      if (!tokens.has(token)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer tokens must exist in the token list.",
          path: ["correct_answer", index],
        });
      }
    });
  });

const writeCodeContentSchema = z.object({
  type: z.literal("write_code"),
  question: z.string().trim().min(1, "Question is required."),
  initial_code: z.string().min(1, "Initial code is required."),
  expected_answer: z.string().min(1, "Expected answer is required."),
});

const exerciseContentSchema = z.union([dragDropCodeContentSchema, writeCodeContentSchema]);

export const exerciseParamsSchema = z.object({
  exerciseId: z.string().uuid("Exercise id must be a valid UUID."),
});

export const createExerciseSchema = z
  .object({
    afterLessonId: z.string().uuid("Lesson id must be a valid UUID.").optional(),
    moduleId: z.string().uuid("Module id must be a valid UUID.").optional(),
    type: exerciseTypeSchema,
    title: z.string().trim().min(1, "Exercise title is required.").max(200),
    description: optionalNullableTrimmedString,
    content: exerciseContentSchema,
  })
  .superRefine((value, context) => {
    if (Boolean(value.afterLessonId) === Boolean(value.moduleId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either afterLessonId or moduleId.",
        path: ["afterLessonId"],
      });
    }

    if (value.content.type !== value.type) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exercise type must match content.type.",
        path: ["content", "type"],
      });
    }
  });

export const updateExerciseSchema = z
  .object({
    afterLessonId: z.union([z.string().uuid("Lesson id must be a valid UUID."), z.null()]).optional(),
    moduleId: z.string().uuid("Module id must be a valid UUID.").optional(),
    type: exerciseTypeSchema.optional(),
    title: optionalTrimmedString,
    description: optionalNullableTrimmedString,
    content: exerciseContentSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.afterLessonId !== undefined && value.afterLessonId !== null && value.moduleId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either afterLessonId or moduleId, not both.",
        path: ["afterLessonId"],
      });
    }

    if (
      value.content &&
      value.type !== undefined &&
      value.content.type !== value.type
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exercise type must match content.type.",
        path: ["content", "type"],
      });
    }

    if (
      value.afterLessonId === undefined &&
      value.moduleId === undefined &&
      value.type === undefined &&
      value.title === undefined &&
      value.description === undefined &&
      value.content === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one exercise field must be provided.",
      });
    }
  });
