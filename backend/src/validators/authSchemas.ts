import { z } from "zod";

export const registerProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  role: z.enum(["student", "teacher"]),
});

// Test completion: the client submits the student's selected option indexes per
// question id; the backend grades it (R15). Any legacy `score_percent` is ignored.
export const completeTestSchema = z.object({
  answers: z
    .record(z.string(), z.array(z.number().int().min(0).max(999)).max(64))
    .default({}),
});

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const updateCurrentUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Email must be valid.")
      .max(320)
      .optional(),
    fullName: z.string().trim().min(1, "Full name is required.").max(120).optional(),
    headline: z.string().trim().min(1, "Headline is required.").max(160).nullable().optional(),
    bio: optionalTrimmedString(3000),
    specialization: optionalTrimmedString(160),
    experienceYears: z.number().int().min(0).max(80).nullable().optional(),
    education: z.string().trim().min(1, "Education is required.").max(200).nullable().optional(),
    educationPlace: optionalTrimmedString(200),
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
