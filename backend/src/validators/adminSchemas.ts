import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["student", "teacher", "admin", "super-admin"]).optional(),
});

export const updateUserParamsSchema = z.object({
  id: z.string().uuid("User id must be a valid UUID."),
});

export const createManagedUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Email must be valid.")
    .max(320),
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  password: z.string().min(6, "Password must be at least 6 characters.").max(72),
  role: z.enum(["student", "teacher"]),
});

export const updateAdminCourseSchema = z.object({
  action: z.enum(["publish", "unpublish", "archive"]),
});

export const updateLandingPageSettingsSchema = z.object({
  courseId: z.string().uuid("Course id must be a valid UUID."),
  lessonId: z.string().uuid("Lesson id must be a valid UUID."),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).nullable().optional(),
    role: z.enum(["student", "teacher", "admin", "super-admin"]).optional(),
  })
  .refine((value) => value.fullName !== undefined || value.role !== undefined, {
    message: "At least one field must be provided.",
  });
