import { z } from "zod";

export const registerProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  role: z.enum(["student", "teacher"]),
});

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const updateCurrentUserSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required.").max(120).optional(),
    headline: z.string().trim().min(1, "Headline is required.").max(160).nullable().optional(),
    bio: optionalTrimmedString(3000),
    specialization: optionalTrimmedString(160),
    experienceYears: z.number().int().min(0).max(80).nullable().optional(),
    education: z.string().trim().min(1, "Education is required.").max(200).nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must use YYYY-MM-DD format.")
      .nullable()
      .optional(),
    avatarPath: optionalTrimmedString(500),
    linkedinUrl: z.string().trim().url("LinkedIn URL must be valid.").max(500).nullable().optional(),
    githubUrl: z.string().trim().url("GitHub URL must be valid.").max(500).nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "At least one field must be provided." }
  );
