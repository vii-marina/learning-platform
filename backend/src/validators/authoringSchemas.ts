import { z } from "zod";

const uuid = (label: string) => z.string().uuid(`${label} must be a valid UUID.`);
const optionalNullableTrimmed = z
  .union([z.string(), z.null()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .optional();

const courseStatus = z.enum(["draft", "published", "archived"]);
const courseAccessType = z.enum(["public", "private", "invite"]);
const testQuestionType = z.enum(["true_false", "single_choice", "multiple_choice"]);

export const courseIdParams = z.object({ courseId: uuid("Course id") });
export const moduleIdParams = z.object({ moduleId: uuid("Module id") });
export const testIdParams = z.object({ testId: uuid("Test id") });
export const questionIdParams = z.object({ questionId: uuid("Question id") });
export const answerIdParams = z.object({ answerId: uuid("Answer id") });

export const createCourseSchema = z.object({
  // teacher_id is intentionally ignored server-side (derived from auth); accepted but not trusted.
  teacher_id: uuid("Teacher id").optional(),
  title: z.string().trim().min(1, "Course title is required.").max(200),
  description: optionalNullableTrimmed,
  status: courseStatus.optional(),
  access_type: courseAccessType.optional(),
  slug: z.string().trim().max(200).optional(),
  thumbnail_path: optionalNullableTrimmed,
  is_published: z.boolean().optional(),
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: optionalNullableTrimmed,
    status: courseStatus.optional(),
    access_type: courseAccessType.optional(),
    slug: z.string().trim().max(200).optional(),
    thumbnail_path: optionalNullableTrimmed,
    is_published: z.boolean().optional(),
    // Soft delete only. Clearing this to null was a self-restore path: a teacher could revive a
    // course an admin had archived. Restoring is an admin action (publish/unpublish clears it).
    deleted_at: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field must be provided." });

export const createModuleSchema = z.object({
  course_id: uuid("Course id"),
  title: z.string().trim().min(1, "Module title is required.").max(200),
  order: z.number().int().positive().optional(),
});

export const updateModuleSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    order: z.number().int().positive().optional(),
  })
  .refine((v) => v.title !== undefined || v.order !== undefined, {
    message: "At least one module field must be provided.",
  });

export const createTestSchema = z.object({
  module_id: uuid("Module id"),
  after_lesson_id: uuid("Lesson id").nullable().optional(),
  title: z.string().trim().min(1, "Test title is required.").max(200),
  order: z.number().int().positive().optional(),
  is_graded: z.boolean().optional(),
});

export const updateTestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    after_lesson_id: uuid("Lesson id").nullable().optional(),
    order: z.number().int().positive().optional(),
    is_graded: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.after_lesson_id !== undefined ||
      v.order !== undefined ||
      v.is_graded !== undefined,
    { message: "At least one test field must be provided." }
  );

export const createQuestionSchema = z.object({
  test_id: uuid("Test id"),
  type: testQuestionType,
  question_text: z.string().trim().min(1, "Question text is required."),
  order: z.number().int().positive().optional(),
  hint: optionalNullableTrimmed,
});

export const updateQuestionSchema = z
  .object({
    type: testQuestionType.optional(),
    question_text: z.string().trim().min(1).optional(),
    order: z.number().int().positive().optional(),
    hint: optionalNullableTrimmed,
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one question field must be provided." });

export const createAnswerSchema = z.object({
  question_id: uuid("Question id"),
  answer_text: z.string(),
  is_correct: z.boolean().optional(),
});

export const updateAnswerSchema = z
  .object({
    answer_text: z.string().optional(),
    is_correct: z.boolean().optional(),
  })
  .refine((v) => v.answer_text !== undefined || v.is_correct !== undefined, {
    message: "At least one answer field must be provided.",
  });

export const reorderSchema = z.object({
  firstId: uuid("First id"),
  secondId: uuid("Second id"),
});

// Bulk "save a whole test's content" (replace-all): collapses the former
// per-question / per-answer round-trips into one request.
const saveAnswerSchema = z.object({
  answer_text: z.string(),
  is_correct: z.boolean().optional(),
});

const saveQuestionSchema = z.object({
  type: testQuestionType,
  question_text: z.string().trim().min(1, "Question text is required."),
  order: z.number().int().positive().optional(),
  hint: optionalNullableTrimmed,
  answers: z.array(saveAnswerSchema).max(20, "A question can have at most 20 answers."),
});

export const saveTestQuestionsSchema = z.object({
  questions: z.array(saveQuestionSchema).max(100, "A test can have at most 100 questions."),
});
