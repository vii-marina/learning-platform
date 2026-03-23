import type { Request, Response } from "express";
import { AppError } from "../lib/appError";
import { getMe, registerProfile } from "../services/authService";
import { registerProfileSchema } from "../validators/authSchemas";

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
