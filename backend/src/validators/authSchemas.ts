import { z } from "zod";

export const registerProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  role: z.enum(["student", "teacher"]),
});
