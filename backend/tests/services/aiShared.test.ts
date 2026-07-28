import { describe, expect, it } from "vitest";

import {
  fillLessonText,
  isTooSimilarToLesson,
  LESSON_TEXT_PLACEHOLDER,
  normalizeForComparison,
  normalizeWhitespace,
} from "../../src/services/aiShared";

const template = `Lesson:\n"""\n${LESSON_TEXT_PLACEHOLDER}\n"""`;

describe("fillLessonText", () => {
  it("splices the lesson text into the placeholder", () => {
    expect(fillLessonText(template, "Hello")).toContain('"""\nHello\n"""');
    expect(fillLessonText(template, "Hello")).not.toContain(LESSON_TEXT_PLACEHOLDER);
  });

  // Regression: a plain string .replace() interprets $-patterns in the
  // replacement, so lesson code containing them silently corrupted the prompt.
  it("keeps $-patterns from the lesson text verbatim", () => {
    const lessonWithDollars = "price = $& + $' and $$ and $1 and $`";

    expect(fillLessonText(template, lessonWithDollars)).toContain(lessonWithDollars);
  });

  it("handles a shell-style lesson snippet", () => {
    const shellSnippet = 'echo "$USER paid $$" && sed "s/a/$&/"';

    expect(fillLessonText(template, shellSnippet)).toContain(shellSnippet);
  });

  it("leaves the template untouched when there is no placeholder", () => {
    expect(fillLessonText("no placeholder here", "lesson")).toBe("no placeholder here");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(normalizeWhitespace("  a \n\t b   c  ")).toBe("a b c");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeWhitespace(" \n\t ")).toBe("");
  });
});

describe("normalizeForComparison", () => {
  it("also lowercases", () => {
    expect(normalizeForComparison("  Hello   WORLD ")).toBe("hello world");
  });
});

describe("isTooSimilarToLesson", () => {
  const lesson = "Функція print виводить значення в консоль.";

  it("flags generated text copied out of the lesson", () => {
    expect(isTooSimilarToLesson("виводить значення", lesson)).toBe(true);
  });

  it("ignores whitespace and case differences when comparing", () => {
    expect(isTooSimilarToLesson("  ВИВОДИТЬ   значення  ", lesson)).toBe(true);
  });

  it("accepts genuinely different text", () => {
    expect(isTooSimilarToLesson("Що робить оператор присвоєння?", lesson)).toBe(false);
  });

  it("does not flag empty input on either side", () => {
    expect(isTooSimilarToLesson("", lesson)).toBe(false);
    expect(isTooSimilarToLesson("будь-що", "")).toBe(false);
  });
});
