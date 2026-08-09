/**
 * Pure helpers for turning stored result rows into the figures the dashboard shows.
 *
 * These are separated because they encode two decisions worth testing directly: which of a
 * student's several progress rows counts as current, and how a stored score is read.
 */

import type { CourseProgressRow, UserTestResultRow } from "./types";

export function getLatestCourseProgressRows(progressRows: CourseProgressRow[]) {
  const progressByUserAndCourse = new Map<string, CourseProgressRow>();

  for (const progressRow of progressRows) {
    const key = `${progressRow.user_id}:${progressRow.course_id}`;
    const currentProgress = progressByUserAndCourse.get(key);

    if (
      !currentProgress ||
      new Date(progressRow.updated_at).getTime() >
        new Date(currentProgress.updated_at).getTime()
    ) {
      progressByUserAndCourse.set(key, progressRow);
    }
  }

  return [...progressByUserAndCourse.values()];
}

export function getNumericTestScore(result: UserTestResultRow) {
  const rawValue =
    result.score_percent ??
    result.percentage ??
    result.percent ??
    result.score ??
    result.result;

  if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
    return null;
  }

  // Scores are written as an integer percentage (scoreSubmission rounds correct/total * 100), but
  // older rows may hold a 0-1 fraction. Only a NON-integer in that range can be a fraction: an
  // integer 1 is a legitimate 1%, and treating it as 0.01 rendered the worst possible non-zero
  // score as a perfect 100.
  const isFraction = rawValue > 0 && rawValue < 1 && !Number.isInteger(rawValue);

  return isFraction ? Math.round(rawValue * 100) : Math.round(rawValue);
}

export function getResultDate(result: UserTestResultRow) {
  const rawValue =
    result.completed_at ?? result.submitted_at ?? result.created_at ?? result.updated_at;

  return typeof rawValue === "string" ? rawValue : null;
}

export function getLatestIsoDate(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
}
