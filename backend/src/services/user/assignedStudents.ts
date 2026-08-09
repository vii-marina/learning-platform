/**
 * Removing a student from a teacher's "assigned students" field.
 *
 * That field has no fixed shape across environments: it may be a Postgres array, a JSON
 * array stored as text, a comma-separated string, or a list of objects keyed by id. It also
 * lives under several different column names. Deleting a student must not leave a dangling
 * reference in any of those forms, so the handling is exhaustive and deliberately pure —
 * this is the part worth testing directly.
 */

import type { UserRole } from "../../types/auth";


export type ProfilePayload = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};

export type BackendError = {
  message: string;
  code?: string;
};

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

export function isAuthUserNotFoundError(error: BackendError) {
  const message = error.message.toLowerCase();

  return message.includes("user not found") || message.includes("not found");
}

export function removeStudentReferenceFromArray(values: unknown[], studentId: string) {
  let changed = false;

  const filtered = values.filter((value) => {
    if (typeof value === "string") {
      const matches = value === studentId;
      changed = changed || matches;
      return !matches;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string"
    ) {
      const matches = value.id === studentId;
      changed = changed || matches;
      return !matches;
    }

    return true;
  });

  return { changed, filtered };
}

export function getNextAssignedStudentsValue(value: unknown, studentId: string) {
  if (Array.isArray(value)) {
    const { changed, filtered } = removeStudentReferenceFromArray(value, studentId);
    return {
      changed,
      nextValue: filtered,
    };
  }

  if (typeof value !== "string") {
    return {
      changed: false,
      nextValue: value,
    };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return {
      changed: false,
      nextValue: value,
    };
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        const { changed, filtered } = removeStudentReferenceFromArray(parsed, studentId);
        return {
          changed,
          nextValue: JSON.stringify(filtered),
        };
      }
    } catch {
      return {
        changed: false,
        nextValue: value,
      };
    }
  }

  if (trimmed.includes(",")) {
    const values = trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const filtered = values.filter((entry) => entry !== studentId);

    return {
      changed: filtered.length !== values.length,
      nextValue: filtered.join(", "),
    };
  }

  if (trimmed === studentId) {
    return {
      changed: true,
      nextValue: null,
    };
  }

  return {
    changed: false,
    nextValue: value,
  };
}

export function getAssignedStudentsFieldName(record: Record<string, unknown>) {
  for (const key of ["assigned_student_ids", "assignedStudents", "student_ids", "students"]) {
    if (key in record) {
      return key;
    }
  }

  return null;
}
