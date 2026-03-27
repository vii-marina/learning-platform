import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import { getMe, registerProfile, updateCurrentUserProfile } from "../services/authService";
import { registerProfileSchema, updateCurrentUserSchema } from "../validators/authSchemas";

function getAuthenticatedUser(req: Request) {
  if (!req.auth) {
    throw new AppError(401, "Authentication is required.", "AUTH_REQUIRED");
  }

  return req.auth;
}

export async function registerProfileHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const input = registerProfileSchema.parse(req.body);
  const user = await registerProfile({
    userId: auth.userId,
    email: auth.email,
    fullName: input.fullName,
    role: input.role,
  });

  res.status(200).json({ user });
}

export async function getMeHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const user = await getMe(auth);

  res.status(200).json({ user });
}

export async function updateMeHandler(req: Request, res: Response) {
  const auth = getAuthenticatedUser(req);
  const input = updateCurrentUserSchema.parse(req.body);
  const user = await updateCurrentUserProfile(auth, {
    email: input.email,
    fullName: input.fullName,
    headline: input.headline,
    bio: input.bio,
    specialization: input.specialization,
    experienceYears: input.experienceYears,
    education: input.education,
    educationPlace: input.educationPlace,
    gender: input.gender,
    birthDate: input.birthDate,
    avatarPath: input.avatarPath,
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
  });

  res.status(200).json({ user });
}
