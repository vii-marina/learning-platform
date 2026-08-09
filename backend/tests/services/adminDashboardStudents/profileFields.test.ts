import { describe, expect, it } from "vitest";

import {
  calculateAge,
  isMissingOptionalRelationError,
  normalizeCourseList,
  normalizeCourseValue,
  pickArrayValue,
  pickNumberValue,
  pickStringValue,
  pickStudentAge,
  toArrayValue,
} from "../../../src/services/adminDashboardStudents/profileFields";

// These readers exist because a student's details are spread across `profiles` and
// `student_profiles`, and the same fact appears under several names. They were untestable
// while they lived inside a 900-line service that imported Supabase at module scope.

describe("pickStringValue", () => {
  it("returns the first non-empty value in record order", () => {
    expect(pickStringValue([{ bio: "second" }, { bio: "first" }], ["bio"])).toBe("second");
  });

  it("respects key priority within a record", () => {
    expect(
      pickStringValue([{ avatarPath: "camel", avatar_path: "snake" }], [
        "avatar_path",
        "avatarPath",
      ])
    ).toBe("snake");
  });

  it("trims the value it returns", () => {
    expect(pickStringValue([{ bio: "  spaced  " }], ["bio"])).toBe("spaced");
  });

  it("skips whitespace-only values rather than returning an empty string", () => {
    expect(pickStringValue([{ bio: "   " }, { bio: "real" }], ["bio"])).toBe("real");
  });

  it("skips null and undefined records", () => {
    expect(pickStringValue([null, undefined, { bio: "found" }], ["bio"])).toBe("found");
  });

  it("ignores non-string values", () => {
    expect(pickStringValue([{ bio: 42 }], ["bio"])).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(pickStringValue([{ other: "x" }], ["bio"])).toBeNull();
  });
});

describe("pickNumberValue", () => {
  it("returns a numeric value directly", () => {
    expect(pickNumberValue([{ age: 30 }], ["age"])).toBe(30);
  });

  it("parses a numeric string, because Postgres may return either", () => {
    expect(pickNumberValue([{ age: "27" }], ["age"])).toBe(27);
  });

  it("rejects a non-numeric string", () => {
    expect(pickNumberValue([{ age: "twenty" }], ["age"])).toBeNull();
  });

  it("rejects NaN and Infinity", () => {
    expect(pickNumberValue([{ age: Number.NaN }], ["age"])).toBeNull();
    expect(pickNumberValue([{ age: Number.POSITIVE_INFINITY }], ["age"])).toBeNull();
  });

  it("treats zero as a real value, not as absent", () => {
    expect(pickNumberValue([{ count: 0 }], ["count"])).toBe(0);
  });
});

describe("toArrayValue", () => {
  it("passes an array through", () => {
    expect(toArrayValue(["a", "b"])).toEqual(["a", "b"]);
  });

  it("parses a JSON array string", () => {
    expect(toArrayValue('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns nothing for malformed JSON instead of throwing", () => {
    expect(toArrayValue("[not json")).toEqual([]);
  });

  // Only a string that opens with "[" is treated as JSON; anything else is data, so a
  // stray object string is kept verbatim rather than silently dropped.
  it("returns a JSON array string that parses to a non-array as a single value", () => {
    expect(toArrayValue('["not-an-array"')).toEqual([]);
    expect(toArrayValue('{"a":1}')).toEqual(['{"a":1}']);
  });

  it("splits a comma-separated string and trims the parts", () => {
    expect(toArrayValue("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("drops empty entries from a comma-separated string", () => {
    expect(toArrayValue("a,,b")).toEqual(["a", "b"]);
  });

  it("wraps a single value in an array", () => {
    expect(toArrayValue("solo")).toEqual(["solo"]);
  });

  it("returns nothing for an empty or non-string value", () => {
    expect(toArrayValue("")).toEqual([]);
    expect(toArrayValue("   ")).toEqual([]);
    expect(toArrayValue(null)).toEqual([]);
    expect(toArrayValue(42)).toEqual([]);
  });
});

describe("pickArrayValue", () => {
  it("returns the first non-empty list", () => {
    expect(
      pickArrayValue([{ a: [], b: ["found"] }], ["a", "b"])
    ).toEqual(["found"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(pickArrayValue([{ other: ["x"] }], ["a"])).toEqual([]);
  });
});

describe("calculateAge", () => {
  it("rejects an unparseable date", () => {
    expect(calculateAge("not a date")).toBeNull();
  });

  it("rejects an implausible age", () => {
    expect(calculateAge("1500-01-01")).toBeNull();
  });

  it("rejects a birth date in the future", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2);

    expect(calculateAge(nextYear.toISOString())).toBeNull();
  });

  it("computes a plausible age for a real date", () => {
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    twentyYearsAgo.setMonth(0, 1);

    expect(calculateAge(twentyYearsAgo.toISOString())).toBe(20);
  });

  // The subtraction is on calendar years, so a birthday later this year has not happened yet.
  it("does not count a birthday that has not arrived this year", () => {
    const now = new Date();
    const notYet = new Date(now);
    notYet.setFullYear(now.getFullYear() - 20);
    notYet.setDate(now.getDate() + 1);

    const age = calculateAge(notYet.toISOString());

    expect(age === 19 || age === 20).toBe(true);
  });
});

describe("pickStudentAge", () => {
  it("prefers a stored age over a birth date", () => {
    expect(pickStudentAge([{ age: 33, birth_date: "1990-01-01" }])).toBe(33);
  });

  it("floors a fractional stored age", () => {
    expect(pickStudentAge([{ age: 33.7 }])).toBe(33);
  });

  it("rejects an out-of-range stored age", () => {
    expect(pickStudentAge([{ age: 500 }])).toBeNull();
    expect(pickStudentAge([{ age: -5 }])).toBeNull();
  });

  it("falls back to a birth date when no age is stored", () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    thirtyYearsAgo.setMonth(0, 1);

    expect(pickStudentAge([{ birthDate: thirtyYearsAgo.toISOString() }])).toBe(30);
  });

  it("returns null when neither is present", () => {
    expect(pickStudentAge([{ bio: "hello" }])).toBeNull();
  });
});

describe("normalizeCourseValue", () => {
  const titles = new Map([["course-1", "Основи Python"]]);

  it("resolves a bare id to its title", () => {
    expect(normalizeCourseValue("course-1", titles)).toBe("Основи Python");
  });

  it("keeps an unrecognised string as-is, so nothing silently disappears", () => {
    expect(normalizeCourseValue("Legacy course", titles)).toBe("Legacy course");
  });

  it("prefers an embedded title over an id lookup", () => {
    expect(normalizeCourseValue({ id: "course-1", title: "Custom" }, titles)).toBe("Custom");
  });

  it("resolves an object carrying only an id", () => {
    expect(normalizeCourseValue({ course_id: "course-1" }, titles)).toBe("Основи Python");
  });

  it("returns null for an empty or unusable value", () => {
    expect(normalizeCourseValue("  ", titles)).toBeNull();
    expect(normalizeCourseValue(null, titles)).toBeNull();
    expect(normalizeCourseValue({}, titles)).toBeNull();
  });
});

describe("normalizeCourseList", () => {
  const titles = new Map([["course-1", "Основи Python"]]);

  it("resolves and preserves order", () => {
    expect(normalizeCourseList(["course-1", "Other"], titles)).toEqual([
      "Основи Python",
      "Other",
    ]);
  });

  it("deduplicates case-insensitively, keeping the first spelling", () => {
    expect(normalizeCourseList(["Python", "python", "PYTHON"], titles)).toEqual(["Python"]);
  });

  it("drops entries that resolve to nothing", () => {
    expect(normalizeCourseList([null, "", "Kept"], titles)).toEqual(["Kept"]);
  });
});

// `student_profiles` is optional: the screen degrades to the base profile rather than
// failing when the table is absent.
describe("isMissingOptionalRelationError", () => {
  it("recognises the PostgREST schema-cache code", () => {
    expect(
      isMissingOptionalRelationError({ message: "anything", code: "PGRST205" }, "student_profiles")
    ).toBe(true);
  });

  it("recognises the Postgres undefined-table code", () => {
    expect(
      isMissingOptionalRelationError({ message: "anything", code: "42P01" }, "student_profiles")
    ).toBe(true);
  });

  it("recognises the message form when it names the relation", () => {
    expect(
      isMissingOptionalRelationError(
        { message: 'relation "public.student_profiles" does not exist' },
        "student_profiles"
      )
    ).toBe(true);
  });

  it("does not match a missing-table message about a different relation", () => {
    expect(
      isMissingOptionalRelationError(
        { message: 'relation "public.courses" does not exist' },
        "student_profiles"
      )
    ).toBe(false);
  });

  it("does not swallow an unrelated error", () => {
    expect(
      isMissingOptionalRelationError(
        { message: "permission denied", code: "42501" },
        "student_profiles"
      )
    ).toBe(false);
  });
});
