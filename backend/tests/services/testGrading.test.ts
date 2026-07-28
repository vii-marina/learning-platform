import { describe, expect, it } from "vitest";

import {
  computeCorrectIndexes,
  groupAnswersByQuestionId,
  isPassingScore,
  isQuestionAnsweredCorrectly,
  scoreSubmission,
  TEST_PASS_THRESHOLD,
  type GradingAnswerRow,
} from "../../src/services/testGrading";

function answer(
  answer_text: string,
  is_correct: boolean,
  question_id = "q1"
): GradingAnswerRow {
  return { question_id, answer_text, is_correct };
}

describe("computeCorrectIndexes", () => {
  it("returns the index of the single correct option", () => {
    const answers = [answer("2", false), answer("4", true), answer("8", false)];

    expect(computeCorrectIndexes("single_choice", answers)).toEqual([1]);
  });

  it("returns every correct index for multiple choice, in option order", () => {
    const answers = [
      answer("list", true),
      answer("int", false),
      answer("dict", true),
      answer("float", false),
    ];

    expect(computeCorrectIndexes("multiple_choice", answers)).toEqual([0, 2]);
  });

  it("returns an empty set when no option is marked correct", () => {
    const answers = [answer("a", false), answer("b", false)];

    expect(computeCorrectIndexes("multiple_choice", answers)).toEqual([]);
    expect(computeCorrectIndexes("true_false", answers)).toEqual([]);
  });

  // R18 regression: answers are stored as «Правда»/«Неправда», so keying on the
  // English literal "false" alone graded every «Неправда»-correct question inverted.
  describe("true_false (R18)", () => {
    it("maps a correct «Правда» to index 0", () => {
      const answers = [answer("Правда", true), answer("Неправда", false)];

      expect(computeCorrectIndexes("true_false", answers)).toEqual([0]);
    });

    it("maps a correct «Неправда» to index 1", () => {
      const answers = [answer("Правда", false), answer("Неправда", true)];

      expect(computeCorrectIndexes("true_false", answers)).toEqual([1]);
    });

    it("still understands the legacy English labels", () => {
      expect(
        computeCorrectIndexes("true_false", [answer("True", true), answer("False", false)])
      ).toEqual([0]);
      expect(
        computeCorrectIndexes("true_false", [answer("True", false), answer("False", true)])
      ).toEqual([1]);
    });

    it("is case- and whitespace-insensitive", () => {
      expect(
        computeCorrectIndexes("true_false", [answer("  НЕПРАВДА  ", true)])
      ).toEqual([1]);
      expect(computeCorrectIndexes("true_false", [answer(" fAlSe ", true)])).toEqual([1]);
    });

    // The resolver reads the label, not the row position, so a legacy row order
    // (false stored first) must still resolve to the «Неправда» option index.
    it("ignores the stored row order", () => {
      const answers = [answer("Неправда", true), answer("Правда", false)];

      expect(computeCorrectIndexes("true_false", answers)).toEqual([1]);
    });

    it("falls back to index 0 for an unrecognized label", () => {
      expect(computeCorrectIndexes("true_false", [answer("Так", true)])).toEqual([0]);
    });
  });
});

describe("isQuestionAnsweredCorrectly", () => {
  it("accepts an exact match", () => {
    expect(isQuestionAnsweredCorrectly([1], [1])).toBe(true);
  });

  it("rejects a wrong selection", () => {
    expect(isQuestionAnsweredCorrectly([1], [0])).toBe(false);
  });

  it("accepts a multi-answer match in any order", () => {
    expect(isQuestionAnsweredCorrectly([0, 2], [2, 0])).toBe(true);
  });

  it("deduplicates the submitted selection", () => {
    expect(isQuestionAnsweredCorrectly([1], [1, 1, 1])).toBe(true);
  });

  it("rejects a partial answer", () => {
    expect(isQuestionAnsweredCorrectly([0, 2], [0])).toBe(false);
  });

  it("rejects an over-selection that contains the correct set", () => {
    expect(isQuestionAnsweredCorrectly([0, 2], [0, 1, 2])).toBe(false);
  });

  it("rejects an empty selection when the question has a correct answer", () => {
    expect(isQuestionAnsweredCorrectly([0], [])).toBe(false);
  });

  // Documents current behaviour: a malformed question with no correct answer
  // marked is scored as correct for a student who selects nothing.
  it("treats an empty-vs-empty comparison as correct", () => {
    expect(isQuestionAnsweredCorrectly([], [])).toBe(true);
  });
});

describe("scoreSubmission", () => {
  const questions = [
    { id: "q1", type: "single_choice" },
    { id: "q2", type: "multiple_choice" },
    { id: "q3", type: "true_false" },
  ];

  const answersByQuestionId = groupAnswersByQuestionId([
    answer("2", false, "q1"),
    answer("4", true, "q1"),
    answer("list", true, "q2"),
    answer("int", false, "q2"),
    answer("dict", true, "q2"),
    answer("Правда", false, "q3"),
    answer("Неправда", true, "q3"),
  ]);

  it("scores a fully correct submission", () => {
    const result = scoreSubmission(questions, answersByQuestionId, {
      q1: [1],
      q2: [0, 2],
      q3: [1],
    });

    expect(result).toEqual({
      scorePercent: 100,
      correctCount: 3,
      totalQuestions: 3,
      perQuestion: { q1: true, q2: true, q3: true },
    });
  });

  it("rounds a partial score and reports it per question", () => {
    const result = scoreSubmission(questions, answersByQuestionId, {
      q1: [1],
      q2: [0],
      q3: [1],
    });

    expect(result.correctCount).toBe(2);
    expect(result.scorePercent).toBe(67);
    expect(result.perQuestion).toEqual({ q1: true, q2: false, q3: true });
  });

  it("treats missing questions in the payload as unanswered", () => {
    const result = scoreSubmission(questions, answersByQuestionId, { q1: [1] });

    expect(result.correctCount).toBe(1);
    expect(result.scorePercent).toBe(33);
    expect(result.perQuestion).toEqual({ q1: true, q2: false, q3: false });
  });

  it("scores an empty submission as zero, never as a pass", () => {
    const result = scoreSubmission(questions, answersByQuestionId, {});

    expect(result.scorePercent).toBe(0);
    expect(isPassingScore(result.scorePercent)).toBe(false);
  });

  it("returns a zeroed result for a test with no questions", () => {
    expect(scoreSubmission([], new Map(), { q1: [0] })).toEqual({
      scorePercent: 0,
      correctCount: 0,
      totalQuestions: 0,
      perQuestion: {},
    });
  });

  // R18 in the aggregate path: a student answering «Неправда» on a
  // «Неправда»-correct question must not be marked wrong.
  it("grades a «Неправда»-correct question in favour of the «Неправда» answer", () => {
    const trueFalseOnly = [{ id: "q3", type: "true_false" }];

    expect(
      scoreSubmission(trueFalseOnly, answersByQuestionId, { q3: [1] }).scorePercent
    ).toBe(100);
    expect(
      scoreSubmission(trueFalseOnly, answersByQuestionId, { q3: [0] }).scorePercent
    ).toBe(0);
  });
});

describe("isPassingScore", () => {
  it("passes at the threshold and above", () => {
    expect(isPassingScore(TEST_PASS_THRESHOLD)).toBe(true);
    expect(isPassingScore(100)).toBe(true);
  });

  it("fails below the threshold", () => {
    expect(isPassingScore(TEST_PASS_THRESHOLD - 1)).toBe(false);
    expect(isPassingScore(0)).toBe(false);
  });

  it("keeps the documented threshold at 70", () => {
    expect(TEST_PASS_THRESHOLD).toBe(70);
  });
});

describe("groupAnswersByQuestionId", () => {
  // Option index order is the stored created_at asc order — grouping must not reshuffle it.
  it("groups answers per question and preserves their input order", () => {
    const grouped = groupAnswersByQuestionId([
      answer("first", false, "q1"),
      answer("other", true, "q2"),
      answer("second", true, "q1"),
    ]);

    expect(grouped.get("q1")?.map((row) => row.answer_text)).toEqual(["first", "second"]);
    expect(grouped.get("q2")?.map((row) => row.answer_text)).toEqual(["other"]);
    expect(grouped.get("missing")).toBeUndefined();
  });
});
