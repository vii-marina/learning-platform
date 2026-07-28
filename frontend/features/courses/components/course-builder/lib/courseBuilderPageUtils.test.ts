import { describe, expect, it } from "vitest";

import type { TestAnswer, TestQuestion, TestQuestionType } from "../../../api/index";
import { mapQuestionToCourseTestQuestion } from "./courseBuilderPageUtils";

function question(type: TestQuestionType, overrides: Partial<TestQuestion> = {}): TestQuestion {
  return {
    id: "question-1",
    test_id: "test-1",
    type,
    question_text: "Питання?",
    order: 1,
    hint: null,
    created_at: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

function answer(answer_text: string, is_correct?: boolean): TestAnswer {
  return {
    id: `answer-${answer_text}`,
    question_id: "question-1",
    answer_text,
    is_correct,
    created_at: "2026-07-28T10:00:00.000Z",
  };
}

describe("mapQuestionToCourseTestQuestion", () => {
  it("maps a single-choice question to the editor shape", () => {
    const mapped = mapQuestionToCourseTestQuestion(
      question("single_choice", { hint: "Підказка" }),
      [answer("2", false), answer("4", true), answer("8", false)]
    );

    expect(mapped).toEqual({
      id: "question-1",
      type: "single_choice",
      questionText: "Питання?",
      options: ["2", "4", "8"],
      correctOptionIndexes: [1],
      hint: "Підказка",
    });
  });

  it("collects every correct index for multiple choice", () => {
    const mapped = mapQuestionToCourseTestQuestion(question("multiple_choice"), [
      answer("list", true),
      answer("int", false),
      answer("dict", true),
    ]);

    expect(mapped.options).toEqual(["list", "int", "dict"]);
    expect(mapped.correctOptionIndexes).toEqual([0, 2]);
  });

  it("substitutes the platform's true/false labels for the stored answers", () => {
    const mapped = mapQuestionToCourseTestQuestion(question("true_false"), [
      answer("True", true),
      answer("False", false),
    ]);

    expect(mapped.options).toEqual(["Правда", "Неправда"]);
  });

  // R18 regression: this mapping runs when a teacher reopens a saved course, and
  // re-saving persists whatever it marked — a wrong index silently flipped
  // `test_answers.is_correct` in the database.
  describe("true_false correct option (R18)", () => {
    it("marks «Правда» when «Правда» is the stored correct answer", () => {
      const mapped = mapQuestionToCourseTestQuestion(question("true_false"), [
        answer("Правда", true),
        answer("Неправда", false),
      ]);

      expect(mapped.correctOptionIndexes).toEqual([0]);
    });

    it("marks «Неправда» when «Неправда» is the stored correct answer", () => {
      const mapped = mapQuestionToCourseTestQuestion(question("true_false"), [
        answer("Правда", false),
        answer("Неправда", true),
      ]);

      expect(mapped.correctOptionIndexes).toEqual([1]);
    });

    it("still understands the legacy English labels", () => {
      expect(
        mapQuestionToCourseTestQuestion(question("true_false"), [
          answer("True", false),
          answer("False", true),
        ]).correctOptionIndexes
      ).toEqual([1]);
    });

    it("ignores the stored row order and casing", () => {
      expect(
        mapQuestionToCourseTestQuestion(question("true_false"), [
          answer("  неправда ", true),
          answer("Правда", false),
        ]).correctOptionIndexes
      ).toEqual([1]);
    });

    // Graded-test payloads withhold `is_correct` entirely (the answer key never
    // reaches the student), so the mapping must degrade to "nothing marked".
    it("returns no correct index when correctness is withheld", () => {
      expect(
        mapQuestionToCourseTestQuestion(question("true_false"), [
          answer("Правда"),
          answer("Неправда"),
        ]).correctOptionIndexes
      ).toEqual([]);
      expect(
        mapQuestionToCourseTestQuestion(question("multiple_choice"), [
          answer("a"),
          answer("b"),
        ]).correctOptionIndexes
      ).toEqual([]);
    });
  });
});
