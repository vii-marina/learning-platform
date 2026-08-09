import { supabase } from "../../../lib/supabase";

type BackendErrorResponse = {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
};

type BackendRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class BackendApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  /**
   * The backend's id for the request that failed. Quoting it in a bug report points
   * straight at the matching server log line, which is otherwise a needle in a haystack.
   */
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function getBackendBaseUrl() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;

  if (!baseUrl) {
    throw new BackendApiError(
      "VITE_BACKEND_URL is not configured.",
      500,
      "BACKEND_URL_MISSING"
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new BackendApiError(error.message, 401, "SESSION_READ_FAILED");
  }

  let session = data.session;

  const isExpired =
    session?.expires_at !== undefined &&
    session.expires_at * 1000 <= Date.now() + 5_000;

  if (!session || isExpired) {
    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw new BackendApiError(refreshError.message, 401, "SESSION_REFRESH_FAILED");
    }

    session = refreshedData.session;
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new BackendApiError("No active Supabase session found.", 401, "SESSION_MISSING");
  }

  return accessToken;
}

function parseErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      message: "Request failed.",
      code: undefined,
      details: undefined,
      requestId: undefined,
    };
  }

  const errorPayload = payload as BackendErrorResponse;

  return {
    message: errorPayload.message ?? errorPayload.error ?? "Request failed.",
    code: errorPayload.code,
    details: errorPayload.details,
    requestId: errorPayload.requestId,
  };
}

/**
 * The single request path. Authenticated and public calls previously duplicated this
 * whole body, so a fix to one silently missed the other; the only real difference is
 * whether an Authorization header is attached.
 */
async function backendRequest<T>(
  path: string,
  options: BackendRequestOptions,
  accessToken: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const errorPayload = parseErrorPayload(payload);

    throw new BackendApiError(
      errorPayload.message,
      response.status,
      errorPayload.code,
      errorPayload.details,
      // The header is set for every response; the body only carries it for errors the
      // backend generated itself. Preferring the body keeps them consistent when both exist.
      errorPayload.requestId ?? response.headers.get("x-request-id") ?? undefined
    );
  }

  return payload as T;
}

export async function authorizedBackendRequest<T>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<T> {
  return backendRequest<T>(path, options, await getAccessToken());
}

export async function publicBackendRequest<T>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<T> {
  return backendRequest<T>(path, options, null);
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof BackendApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
