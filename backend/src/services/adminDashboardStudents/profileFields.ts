/**
 * Readers that pull a typed value out of loosely-shaped profile rows.
 *
 * A student's details are spread over `profiles`, `student_profiles` and whatever extra
 * columns exist, and the same fact appears under different names in different rows
 * (`full_name` vs `fullName`, `birth_date` vs `birthDate`). Each reader takes the records
 * in priority order and returns the first usable value, so callers never repeat the
 * fallback chain.
 *
 * Everything here is pure — no Supabase, no request context — which is what makes it
 * directly testable.
 */

import type { BackendError } from "./types";

export function isMissingOptionalRelationError(error: BackendError, relationName: string) {
  const message = error.message.toLowerCase();
  const relation = relationName.toLowerCase();

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes(relation) &&
      (message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
}

export function pickStringValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

export function pickNumberValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }

  return null;
}

export function toArrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [] as unknown[];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [] as unknown[];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as unknown[];
    }
  }

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

export function pickArrayValue(
  records: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
) {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      const values = toArrayValue(record[key]);

      if (values.length > 0) {
        return values;
      }
    }
  }

  return [] as unknown[];
}

export function calculateAge(dateValue: string) {
  const birthday = new Date(dateValue);

  if (Number.isNaN(birthday.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birthday.getMonth() ||
    (now.getMonth() === birthday.getMonth() && now.getDate() >= birthday.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  if (age < 0 || age > 120) {
    return null;
  }

  return age;
}

export function pickStudentAge(records: Array<Record<string, unknown> | null | undefined>) {
  const directAge = pickNumberValue(records, [
    "age",
    "student_age",
    "studentAge",
  ]);

  if (directAge !== null) {
    const normalizedAge = Math.floor(directAge);
    return normalizedAge >= 0 && normalizedAge <= 120 ? normalizedAge : null;
  }

  const birthDate = pickStringValue(records, [
    "date_of_birth",
    "dateOfBirth",
    "birth_date",
    "birthDate",
    "birthday",
  ]);

  if (!birthDate) {
    return null;
  }

  return calculateAge(birthDate);
}

export function normalizeCourseValue(
  value: unknown,
  courseTitlesById: Map<string, string>
) {
  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    return courseTitlesById.get(normalizedValue) ?? normalizedValue;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = pickStringValue([record], [
    "title",
    "name",
    "label",
    "course_title",
    "courseTitle",
  ]);

  if (title) {
    return title;
  }

  const courseId = pickStringValue([record], ["id", "course_id", "courseId"]);

  if (!courseId) {
    return null;
  }

  return courseTitlesById.get(courseId) ?? courseId;
}

export function normalizeCourseList(values: unknown[], courseTitlesById: Map<string, string>) {
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const title = normalizeCourseValue(value, courseTitlesById);

    if (!title) {
      continue;
    }

    const normalizedTitle = title.toLowerCase();

    if (seen.has(normalizedTitle)) {
      continue;
    }

    seen.add(normalizedTitle);
    titles.push(title);
  }

  return titles;
}
