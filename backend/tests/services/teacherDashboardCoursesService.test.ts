import { describe, expect, it, vi } from "vitest";

// Only the pure score reader is under test; Supabase is stubbed so importing the module is safe.
vi.mock("../../src/lib/supabase", () => ({ supabaseAdmin: {} }));

const { getNumericTestScore } = await import(
  "../../src/services/teacherDashboardCoursesService"
);

// The teacher's students view renders whatever this returns as "best score". The reader used to
// treat any value in (0, 1] as a 0-1 fraction and multiply by 100, so a student who scored a
// genuine 1% on an 80-question test was shown to their teacher as 100%.
describe("getNumericTestScore", () => {
  it("returns an integer percentage unchanged", () => {
    expect(getNumericTestScore({ score: 73 })).toBe(73);
    expect(getNumericTestScore({ score: 100 })).toBe(100);
    expect(getNumericTestScore({ score: 0 })).toBe(0);
  });

  it("does not inflate a legitimate 1% score", () => {
    expect(getNumericTestScore({ score: 1 })).toBe(1);
  });

  it("still scales a legacy 0-1 fraction", () => {
    expect(getNumericTestScore({ score: 0.85 })).toBe(85);
    expect(getNumericTestScore({ score: 0.5 })).toBe(50);
  });

  it("prefers score_percent over score when both are present", () => {
    expect(getNumericTestScore({ score_percent: 42, score: 7 })).toBe(42);
  });

  it("returns null when no usable numeric value exists", () => {
    expect(getNumericTestScore({})).toBeNull();
    expect(getNumericTestScore({ score: null })).toBeNull();
    expect(getNumericTestScore({ score: "80" })).toBeNull();
    expect(getNumericTestScore({ score: Number.NaN })).toBeNull();
  });

  it("rounds fractional percentages", () => {
    expect(getNumericTestScore({ score: 66.6 })).toBe(67);
    expect(getNumericTestScore({ score: 33.2 })).toBe(33);
  });
});
