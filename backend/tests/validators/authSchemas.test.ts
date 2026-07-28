import { describe, expect, it } from "vitest";

import { completeTestSchema } from "../../src/validators/authSchemas";

// R15 regression: the client used to submit its own `score_percent`, which the
// endpoint stored verbatim. The schema now accepts selected option indexes only,
// and any client-sent score must be dropped before it can reach the service.
describe("completeTestSchema", () => {
  it("accepts a submission of selected option indexes", () => {
    const parsed = completeTestSchema.parse({ answers: { "q-1": [0, 2], "q-2": [1] } });

    expect(parsed.answers).toEqual({ "q-1": [0, 2], "q-2": [1] });
  });

  it("strips a client-supplied score", () => {
    const parsed = completeTestSchema.parse({
      answers: { "q-1": [0] },
      score_percent: 100,
      passed: true,
    });

    expect(parsed).toEqual({ answers: { "q-1": [0] } });
    expect("score_percent" in parsed).toBe(false);
    expect("passed" in parsed).toBe(false);
  });

  it("defaults to an empty submission", () => {
    expect(completeTestSchema.parse({})).toEqual({ answers: {} });
  });

  it("rejects a non-integer or negative option index", () => {
    expect(completeTestSchema.safeParse({ answers: { "q-1": [1.5] } }).success).toBe(false);
    expect(completeTestSchema.safeParse({ answers: { "q-1": [-1] } }).success).toBe(false);
  });

  it("rejects an out-of-range option index", () => {
    expect(completeTestSchema.safeParse({ answers: { "q-1": [1000] } }).success).toBe(false);
    expect(completeTestSchema.safeParse({ answers: { "q-1": [999] } }).success).toBe(true);
  });

  it("rejects an absurdly long selection", () => {
    const tooMany = Array.from({ length: 65 }, (_, index) => index);

    expect(completeTestSchema.safeParse({ answers: { "q-1": tooMany } }).success).toBe(false);
  });

  it("rejects a non-numeric selection", () => {
    expect(completeTestSchema.safeParse({ answers: { "q-1": ["0"] } }).success).toBe(false);
    expect(completeTestSchema.safeParse({ answers: "all-correct" }).success).toBe(false);
  });
});
