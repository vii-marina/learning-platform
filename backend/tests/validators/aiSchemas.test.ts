import { describe, expect, it } from "vitest";

import {
  exerciseGenerationLimitSchema,
  generateExerciseSchema,
  generateTestQuestionsSchema,
} from "../../src/validators/aiSchemas";

const LESSON_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";

// R4 regression: AI request bodies are schema-validated, so a malformed body is a
// 400 instead of reaching the generator (and the OpenAI bill).
describe("generateTestQuestionsSchema", () => {
  it("accepts a lesson target", () => {
    const parsed = generateTestQuestionsSchema.parse({
      afterLessonId: LESSON_ID,
      questionCount: 5,
      generationMode: "mixed",
    });

    expect(parsed.afterLessonId).toBe(LESSON_ID);
    expect(parsed.questionCount).toBe(5);
  });

  it("accepts a module target", () => {
    expect(generateTestQuestionsSchema.safeParse({ moduleId: MODULE_ID }).success).toBe(true);
  });

  it("requires at least one generation target", () => {
    const result = generateTestQuestionsSchema.safeParse({ questionCount: 5 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Provide either afterLessonId or moduleId.");
  });

  it("rejects a non-uuid target", () => {
    expect(generateTestQuestionsSchema.safeParse({ afterLessonId: "lesson-1" }).success).toBe(
      false
    );
  });

  it("caps the requested question count", () => {
    expect(
      generateTestQuestionsSchema.safeParse({ moduleId: MODULE_ID, questionCount: 100 }).success
    ).toBe(true);
    expect(
      generateTestQuestionsSchema.safeParse({ moduleId: MODULE_ID, questionCount: 101 }).success
    ).toBe(false);
    expect(
      generateTestQuestionsSchema.safeParse({ moduleId: MODULE_ID, questionCount: 0 }).success
    ).toBe(false);
  });

  it("rejects an unknown generation mode", () => {
    expect(
      generateTestQuestionsSchema.safeParse({ moduleId: MODULE_ID, generationMode: "essay" })
        .success
    ).toBe(false);
  });
});

describe("generateExerciseSchema", () => {
  it("accepts the two supported exercise types", () => {
    expect(
      generateExerciseSchema.safeParse({ moduleId: MODULE_ID, type: "drag_drop_code" }).success
    ).toBe(true);
    expect(
      generateExerciseSchema.safeParse({ moduleId: MODULE_ID, type: "write_code" }).success
    ).toBe(true);
  });

  it("requires a type", () => {
    expect(generateExerciseSchema.safeParse({ moduleId: MODULE_ID }).success).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(
      generateExerciseSchema.safeParse({ moduleId: MODULE_ID, type: "multiple_choice" }).success
    ).toBe(false);
  });

  it("requires a non-empty difficulty list when provided", () => {
    expect(
      generateExerciseSchema.safeParse({
        moduleId: MODULE_ID,
        type: "write_code",
        difficulties: [],
      }).success
    ).toBe(false);
    expect(
      generateExerciseSchema.safeParse({
        moduleId: MODULE_ID,
        type: "write_code",
        difficulties: ["easy", "hard"],
      }).success
    ).toBe(true);
  });

  it("caps the requested count", () => {
    expect(
      generateExerciseSchema.safeParse({ moduleId: MODULE_ID, type: "write_code", count: 20 })
        .success
    ).toBe(true);
    expect(
      generateExerciseSchema.safeParse({ moduleId: MODULE_ID, type: "write_code", count: 21 })
        .success
    ).toBe(false);
  });
});

describe("exerciseGenerationLimitSchema", () => {
  it("still requires a target", () => {
    expect(exerciseGenerationLimitSchema.safeParse({}).success).toBe(false);
    expect(exerciseGenerationLimitSchema.safeParse({ moduleId: MODULE_ID }).success).toBe(true);
  });
});
