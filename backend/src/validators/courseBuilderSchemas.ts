import { z } from "zod";

const optionalTrimmedString = z.string().transform((value) => value.trim()).optional();
const optionalNullableTrimmedString = z
  .union([z.string(), z.null()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .optional();

export const moduleParamsSchema = z.object({
  moduleId: z.string().uuid("Module id must be a valid UUID."),
});

export const lessonParamsSchema = z.object({
  lessonId: z.string().uuid("Lesson id must be a valid UUID."),
});

export const lessonBlockParamsSchema = z.object({
  lessonBlockId: z.string().uuid("Lesson block id must be a valid UUID."),
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(1, "Lesson title is required.").max(200),
  content: z.union([z.string(), z.null()]).optional(),
  videoUrl: optionalNullableTrimmedString,
  contentType: optionalNullableTrimmedString,
  order: z.number().int().positive().optional(),
});

export const updateLessonSchema = z
  .object({
    title: optionalTrimmedString,
    content: z.union([z.string(), z.null()]).optional(),
    videoUrl: optionalNullableTrimmedString,
    contentType: optionalNullableTrimmedString,
    order: z.number().int().positive().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.content !== undefined ||
      value.videoUrl !== undefined ||
      value.contentType !== undefined ||
      value.order !== undefined,
    {
      message: "At least one lesson field must be provided.",
    }
  );

export const createLessonBlockSchema = z.object({
  blockType: z.string().trim().min(1, "Lesson block type is required.").max(100),
  content: z.record(z.string(), z.unknown()),
  order: z.number().int().positive().optional(),
});

export const updateLessonBlockSchema = z
  .object({
    blockType: optionalTrimmedString,
    content: z.record(z.string(), z.unknown()).optional(),
    order: z.number().int().positive().optional(),
  })
  .refine(
    (value) =>
      value.blockType !== undefined || value.content !== undefined || value.order !== undefined,
    {
      message: "At least one lesson block field must be provided.",
    }
  );
