import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError, toServiceError } from "../../src/lib/appError";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppError", () => {
  it("carries the status code, code and optional details", () => {
    const error = new AppError(403, "Forbidden.", "FORBIDDEN", { field: "id" });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("Forbidden.");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.details).toEqual({ field: "id" });
  });
});

// R16 regression: the error handler returns AppError.message verbatim to the
// client, so the raw Postgres/Supabase detail must never reach the message.
describe("toServiceError", () => {
  const dbDetail =
    'duplicate key value violates unique constraint "test_answers_question_id_key"';

  it("returns only the safe fallback message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error = toServiceError(500, "ANSWER_SAVE_FAILED", "Unable to save answer", {
      message: dbDetail,
    });

    expect(error.message).toBe("Unable to save answer");
    expect(error.message).not.toContain(dbDetail);
    expect(error.message).not.toContain("constraint");
  });

  it("preserves the status code and error code", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error = toServiceError(500, "ANSWER_SAVE_FAILED", "Unable to save answer", {
      message: dbDetail,
    });

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("ANSWER_SAVE_FAILED");
    expect(error.details).toBeUndefined();
  });

  it("logs the underlying detail server-side", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    toServiceError(500, "ANSWER_SAVE_FAILED", "Unable to save answer", {
      message: dbDetail,
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain(dbDetail);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("ANSWER_SAVE_FAILED");
  });
});
