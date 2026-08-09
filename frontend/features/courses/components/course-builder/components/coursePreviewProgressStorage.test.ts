import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readStoredProgress,
  resolveInitialSelection,
  writeStoredProgress,
  type LessonRef,
} from "./coursePreviewProgressStorage";
import type { Lesson, Module } from "../../../api/index";

function makeModule(id: string): Module {
  return { id, course_id: "course-1", title: id, order: 1 } as Module;
}

function makeLesson(id: string, moduleId: string): Lesson {
  return { id, module_id: moduleId, title: id, order: 1 } as Lesson;
}

const moduleA = makeModule("module-a");
const moduleB = makeModule("module-b");
const lessonA = makeLesson("lesson-a", "module-a");
const lessonB = makeLesson("lesson-b", "module-b");

const lessonSequence: LessonRef[] = [
  { module: moduleA, lesson: lessonA },
  { module: moduleB, lesson: lessonB },
];
const lessonRefById = new Map(lessonSequence.map((ref) => [ref.lesson.id, ref]));
const modules = [moduleA, moduleB];

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readStoredProgress", () => {
  it("returns null when nothing is stored", () => {
    expect(readStoredProgress("key")).toBeNull();
  });

  it("parses a stored payload", () => {
    window.localStorage.setItem("key", JSON.stringify({ lessonId: "lesson-a" }));

    expect(readStoredProgress("key")).toEqual({ lessonId: "lesson-a" });
  });

  // Whatever is in storage was written by an older build and may be anything.
  it("returns null for unparseable content rather than throwing", () => {
    window.localStorage.setItem("key", "{not json");

    expect(() => readStoredProgress("key")).not.toThrow();
    expect(readStoredProgress("key")).toBeNull();
  });

  it("returns null when storage itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    expect(readStoredProgress("key")).toBeNull();
  });
});

describe("writeStoredProgress", () => {
  it("stores a payload that reads back", () => {
    writeStoredProgress("key", { lessonId: "lesson-a", moduleId: "module-a" });

    expect(readStoredProgress("key")).toMatchObject({ lessonId: "lesson-a" });
  });

  // Losing your place is a far smaller failure than a preview that will not open.
  it("swallows a quota or availability error", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => writeStoredProgress("key", { lessonId: "x" })).not.toThrow();
  });
});

describe("resolveInitialSelection", () => {
  it("falls back to the first lesson when nothing is stored", () => {
    const result = resolveInitialSelection({
      storedProgress: null,
      lessonRefById,
      lessonSequence,
      modules,
    });

    expect(result).toEqual({ moduleId: "module-a", lessonId: "lesson-a" });
  });

  it("restores a stored position that still exists", () => {
    const result = resolveInitialSelection({
      storedProgress: { lessonId: "lesson-b", moduleId: "module-b" },
      lessonRefById,
      lessonSequence,
      modules,
    });

    expect(result).toEqual({ moduleId: "module-b", lessonId: "lesson-b" });
  });

  // The teacher may have deleted that lesson since it was stored.
  it("ignores a stored lesson that no longer exists", () => {
    const result = resolveInitialSelection({
      storedProgress: { lessonId: "lesson-deleted", moduleId: "module-b" },
      lessonRefById,
      lessonSequence,
      modules,
    });

    expect(result.lessonId).toBe("lesson-a");
  });

  it("ignores a stored module that no longer exists and derives it from the lesson", () => {
    const result = resolveInitialSelection({
      storedProgress: { lessonId: "lesson-b", moduleId: "module-deleted" },
      lessonRefById,
      lessonSequence,
      modules,
    });

    expect(result).toEqual({ moduleId: "module-b", lessonId: "lesson-b" });
  });

  it("returns nulls for a course with no lessons at all", () => {
    const result = resolveInitialSelection({
      storedProgress: null,
      lessonRefById: new Map(),
      lessonSequence: [],
      modules: [],
    });

    expect(result).toEqual({ moduleId: null, lessonId: null });
  });

  it("still opens the first module when the course has modules but no lessons", () => {
    const result = resolveInitialSelection({
      storedProgress: null,
      lessonRefById: new Map(),
      lessonSequence: [],
      modules,
    });

    expect(result).toEqual({ moduleId: "module-a", lessonId: null });
  });
});
