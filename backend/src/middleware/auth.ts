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

/**
 * True when Supabase actually evaluated the token and rejected it, false when the call never got
 * an answer (network, DNS, timeout, GoTrue 5xx). auth-js gives retryable transport failures no
 * status at all, and tags them `AuthRetryableFetchError`.
 */
function isTokenRejection(error: { status?: number; name?: string }) {
  if (error.name === "AuthRetryableFetchError") {
    return false;
  }

  return typeof error.status === "number" && error.status >= 400 && error.status < 500;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req.header("Authorization"));

    if (!token) {
      throw new AppError(401, "Missing or invalid bearer token.", "AUTH_TOKEN_MISSING");
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    // auth-js reports transport failures through `error` rather than throwing, so a DNS failure,
    // a GoTrue 5xx or a misconfigured SUPABASE_URL used to land in the same branch as a genuinely
    // bad token. That answered every request with 401, which the dashboards turn into a forced
    // logout — so an upstream outage looked like every user's session expiring at once, with
    // nothing logged. Only an actual 4xx from GoTrue means the token is bad.
    if (error && !isTokenRejection(error)) {
      console.error(
        `[AUTH_UPSTREAM_UNAVAILABLE] Supabase auth did not answer: ${error.message}`
      );
      throw new AppError(
        503,
        "Authentication service is temporarily unavailable.",
        "AUTH_UPSTREAM_UNAVAILABLE"
      );
    }

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
