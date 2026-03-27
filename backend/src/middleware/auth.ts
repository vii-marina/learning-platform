import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/appError";
import { supabaseAdmin } from "../lib/supabase";
import { getRequestAuthContext } from "../services/userService";

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getBearerToken(headerValue?: string): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req.header("Authorization"));

    if (!token) {
      throw new AppError(401, "Missing or invalid bearer token.", "AUTH_TOKEN_MISSING");
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, "Invalid or expired access token.", "AUTH_TOKEN_INVALID");
    }

    const email = data.user.email;

    if (!email) {
      throw new AppError(400, "Authenticated user is missing an email.", "AUTH_EMAIL_MISSING");
    }

    const fallbackFullName = getMetadataString(
      (data.user.user_metadata as Record<string, unknown> | undefined) ?? null,
      ["full_name", "fullName", "name"]
    );

    req.auth = await getRequestAuthContext(data.user.id, email, fallbackFullName);
    next();
  } catch (error) {
    next(error);
  }
}
