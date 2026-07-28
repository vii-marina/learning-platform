import { describe, expect, it } from "vitest";

import { detectMaxDifficulty, filterDifficulties } from "../../src/services/exerciseDifficulty";

describe("detectMaxDifficulty", () => {
  it("treats plain prose with no code constructs as easy", () => {
    expect(detectMaxDifficulty("Змінна зберігає значення, яке можна змінити.")).toBe("easy");
  });

  it("detects medium content from basic statements", () => {
    expect(detectMaxDifficulty("print(x)")).toBe("medium");
    expect(detectMaxDifficulty("if x > 1: ...")).toBe("medium");
    expect(detectMaxDifficulty("total = a + b")).toBe("medium");
  });

  it("detects hard content from loops, functions and collections", () => {
    expect(detectMaxDifficulty("for item in items:")).toBe("hard");
    expect(detectMaxDifficulty("while True:")).toBe("hard");
    expect(detectMaxDifficulty("def greet(name):")).toBe("hard");
    expect(detectMaxDifficulty("Працюємо зі списками (lists) у Python")).toBe("hard");
  });

  it("detects hard content from tuple unpacking", () => {
    expect(detectMaxDifficulty("first, second = 1, 2")).toBe("hard");
  });

  it("detects hard content from nested conditionals", () => {
    expect(detectMaxDifficulty("if a:\n    if b:\n        pass")).toBe("hard");
  });
});

describe("filterDifficulties", () => {
  it("keeps only the requested levels allowed by the cap", () => {
    expect(filterDifficulties(["easy", "medium", "hard"], "medium")).toEqual([
      "easy",
      "medium",
    ]);
  });

  it("keeps everything when the cap is hard", () => {
    expect(filterDifficulties(["easy", "medium", "hard"], "hard")).toEqual([
      "easy",
      "medium",
      "hard",
    ]);
  });

  it("preserves the requested order", () => {
    expect(filterDifficulties(["medium", "easy"], "hard")).toEqual(["medium", "easy"]);
  });

  // The generator always needs at least one level to work with.
  it("falls back to the cap when nothing requested is allowed", () => {
    expect(filterDifficulties(["hard"], "easy")).toEqual(["easy"]);
    expect(filterDifficulties([], "medium")).toEqual(["medium"]);
  });
});
