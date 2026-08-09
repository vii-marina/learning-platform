import { describe, expect, it } from "vitest";

import {
  getAssignedStudentsFieldName,
  getNextAssignedStudentsValue,
  isAuthUserNotFoundError,
  isMissingOptionalRelationError,
  removeStudentReferenceFromArray,
} from "../../../src/services/user/assignedStudents";

// Deleting a student must not leave a dangling reference on a teacher profile. The field
// has no fixed shape across environments, so each form is pinned here — a missed form
// means an orphaned id that later reads back as a student who no longer exists.

describe("removeStudentReferenceFromArray", () => {
  it("removes a plain id and reports the change", () => {
    const result = removeStudentReferenceFromArray(["a", "b"], "a");

    expect(result.changed).toBe(true);
    expect(result.filtered).toEqual(["b"]);
  });

  it("removes an object entry keyed by id", () => {
    const result = removeStudentReferenceFromArray([{ id: "a" }, { id: "b" }], "a");

    expect(result.changed).toBe(true);
    expect(result.filtered).toEqual([{ id: "b" }]);
  });

  it("reports no change when the student is absent", () => {
    const result = removeStudentReferenceFromArray(["b", "c"], "a");

    expect(result.changed).toBe(false);
    expect(result.filtered).toEqual(["b", "c"]);
  });

  it("leaves entries it does not understand alone rather than dropping them", () => {
    const result = removeStudentReferenceFromArray([42, null, { name: "x" }], "a");

    expect(result.changed).toBe(false);
    expect(result.filtered).toEqual([42, null, { name: "x" }]);
  });

  it("removes every occurrence, not just the first", () => {
    const result = removeStudentReferenceFromArray(["a", "b", "a"], "a");

    expect(result.filtered).toEqual(["b"]);
  });
});

describe("getNextAssignedStudentsValue", () => {
  it("handles a real array", () => {
    const result = getNextAssignedStudentsValue(["a", "b"], "a");

    expect(result.changed).toBe(true);
    expect(result.nextValue).toEqual(["b"]);
  });

  it("handles a JSON array stored as text, and writes it back as JSON", () => {
    const result = getNextAssignedStudentsValue('["a","b"]', "a");

    expect(result.changed).toBe(true);
    expect(result.nextValue).toBe('["b"]');
  });

  it("handles a comma-separated list", () => {
    const result = getNextAssignedStudentsValue("a, b, c", "b");

    expect(result.changed).toBe(true);
    expect(result.nextValue).toBe("a, c");
  });

  it("nulls the field when the student was its only value", () => {
    const result = getNextAssignedStudentsValue("a", "a");

    expect(result.changed).toBe(true);
    expect(result.nextValue).toBeNull();
  });

  it("leaves a single unrelated value untouched", () => {
    const result = getNextAssignedStudentsValue("b", "a");

    expect(result.changed).toBe(false);
    expect(result.nextValue).toBe("b");
  });

  // A write triggered by "changed" would otherwise replace real data with a parse failure.
  it("does not report a change when the JSON cannot be parsed", () => {
    const result = getNextAssignedStudentsValue('["a", broken', "a");

    expect(result.changed).toBe(false);
    expect(result.nextValue).toBe('["a", broken');
  });

  it("ignores null, undefined and non-string scalars", () => {
    expect(getNextAssignedStudentsValue(null, "a").changed).toBe(false);
    expect(getNextAssignedStudentsValue(undefined, "a").changed).toBe(false);
    expect(getNextAssignedStudentsValue(42, "a").changed).toBe(false);
  });

  it("ignores an empty or whitespace-only string", () => {
    expect(getNextAssignedStudentsValue("   ", "a").changed).toBe(false);
  });

  it("handles a JSON array of objects", () => {
    const result = getNextAssignedStudentsValue('[{"id":"a"},{"id":"b"}]', "a");

    expect(result.changed).toBe(true);
    expect(result.nextValue).toBe('[{"id":"b"}]');
  });
});

describe("getAssignedStudentsFieldName", () => {
  it("finds each supported column name", () => {
    expect(getAssignedStudentsFieldName({ assigned_student_ids: [] })).toBe(
      "assigned_student_ids"
    );
    expect(getAssignedStudentsFieldName({ assignedStudents: [] })).toBe("assignedStudents");
    expect(getAssignedStudentsFieldName({ student_ids: [] })).toBe("student_ids");
    expect(getAssignedStudentsFieldName({ students: [] })).toBe("students");
  });

  it("prefers the canonical name when several are present", () => {
    expect(
      getAssignedStudentsFieldName({ students: [], assigned_student_ids: [] })
    ).toBe("assigned_student_ids");
  });

  it("returns null when the record has no such field", () => {
    expect(getAssignedStudentsFieldName({ bio: "x" })).toBeNull();
  });

  // `in` rather than a truthiness check: a column that exists but is null still needs clearing.
  it("finds a field that exists but is null", () => {
    expect(getAssignedStudentsFieldName({ student_ids: null })).toBe("student_ids");
  });
});

describe("error classification", () => {
  it("recognises a missing optional relation by code", () => {
    expect(isMissingOptionalRelationError({ message: "x", code: "42P01" }, "teacher_profiles")).toBe(
      true
    );
  });

  it("recognises a missing optional relation by message", () => {
    expect(
      isMissingOptionalRelationError(
        { message: 'relation "teacher_profiles" does not exist' },
        "teacher_profiles"
      )
    ).toBe(true);
  });

  it("does not treat an unrelated failure as a missing relation", () => {
    expect(
      isMissingOptionalRelationError({ message: "permission denied" }, "teacher_profiles")
    ).toBe(false);
  });

  it("recognises an absent auth user", () => {
    expect(isAuthUserNotFoundError({ message: "User not found" })).toBe(true);
  });

  it("does not treat an unrelated auth failure as an absent user", () => {
    expect(isAuthUserNotFoundError({ message: "invalid token" })).toBe(false);
  });
});
