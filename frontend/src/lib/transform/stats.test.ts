import { describe, expect, it } from "vitest";
import { sampleStats } from "./stats";

describe("sampleStats", () => {
  it("computes mean/median/min/max/std/n", () => {
    const s = sampleStats([2, 4, 6]);
    expect(s.mean).toBe(4);
    expect(s.median).toBe(4);
    expect(s.min).toBe(2);
    expect(s.max).toBe(6);
    expect(s.n).toBe(3);
    expect(s.std).toBeCloseTo(2, 10); // sample std of [2,4,6]
  });

  it("median of an even-length array averages the middle pair", () => {
    expect(sampleStats([1, 2, 3, 4]).median).toBe(2.5);
  });

  it("single sample has zero std", () => {
    const s = sampleStats([5]);
    expect(s.mean).toBe(5);
    expect(s.std).toBe(0);
    expect(s.n).toBe(1);
  });

  it("throws on empty input", () => {
    expect(() => sampleStats([])).toThrow();
  });
});
