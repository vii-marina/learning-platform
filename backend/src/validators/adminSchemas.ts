import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["student", "teacher", "admin", "super-admin"]).optional(),
});

export const updateUserParamsSchema = z.object({
  id: z.string().uuid("User id must be a valid UUID."),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).nullable().optional(),
    role: z.enum(["student", "teacher", "admin", "super-admin"]).optional(),
  })
  .refine((value) => value.fullName !== undefined || value.role !== undefined, {
    message: "At least one field must be provided.",
  });
