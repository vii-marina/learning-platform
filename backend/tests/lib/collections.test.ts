import { describe, expect, it } from "vitest";

import {
  chunkValues,
  groupByToMap,
  groupByToRecord,
  groupCounts,
} from "../../src/lib/collections";

describe("chunkValues", () => {
  it("returns nothing for an empty list", () => {
    expect(chunkValues([])).toEqual([]);
  });

  it("keeps a short list in one chunk", () => {
    expect(chunkValues([1, 2, 3], 50)).toEqual([[1, 2, 3]]);
  });

  it("splits at the chunk size", () => {
    expect(chunkValues([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("defaults to batches of 50", () => {
    const chunks = chunkValues(Array.from({ length: 125 }, (_, index) => index));

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[2]).toHaveLength(25);
  });

  it("loses no items", () => {
    const values = Array.from({ length: 97 }, (_, index) => index);

    expect(chunkValues(values, 10).flat()).toEqual(values);
  });
});

describe("groupCounts", () => {
  it("counts per key", () => {
    const counts = groupCounts(
      [{ id: "a" }, { id: "b" }, { id: "a" }],
      (item) => item.id
    );

    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
  });

  it("reports an absent key as undefined, not zero", () => {
    expect(groupCounts([], (item: { id: string }) => item.id).get("missing")).toBeUndefined();
  });
});

describe("groupByToMap", () => {
  it("collects items under their key", () => {
    const groups = groupByToMap(
      [
        { id: "1", moduleId: "m1" },
        { id: "2", moduleId: "m2" },
        { id: "3", moduleId: "m1" },
      ],
      (item) => item.moduleId
    );

    expect(groups.get("m1")?.map((item) => item.id)).toEqual(["1", "3"]);
    expect(groups.get("m2")?.map((item) => item.id)).toEqual(["2"]);
  });

  it("preserves input order within a group", () => {
    const groups = groupByToMap(
      [{ n: 1 }, { n: 2 }, { n: 3 }],
      () => "same"
    );

    expect(groups.get("same")?.map((item) => item.n)).toEqual([1, 2, 3]);
  });

  // A row with no foreign key belongs to nothing; collecting it under "" would attach it
  // to an arbitrary parent.
  it("drops items with no key", () => {
    const groups = groupByToMap(
      [{ id: "1", parent: null }, { id: "2", parent: "p1" }, { id: "3", parent: "" }],
      (item) => item.parent
    );

    expect(groups.size).toBe(1);
    expect(groups.get("p1")?.map((item) => item.id)).toEqual(["2"]);
  });
});

describe("groupByToRecord", () => {
  it("collects items under their key", () => {
    const groups = groupByToRecord(
      [
        { id: "1", lessonId: "l1" },
        { id: "2", lessonId: "l1" },
      ],
      (item) => item.lessonId
    );

    expect(groups.l1.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("returns an empty object for no items", () => {
    expect(groupByToRecord([], (item: { id: string }) => item.id)).toEqual({});
  });

  it("has no prototype keys that could be mistaken for groups", () => {
    const groups = groupByToRecord([{ key: "a" }], (item) => item.key);

    expect(Object.keys(groups)).toEqual(["a"]);
  });
});
