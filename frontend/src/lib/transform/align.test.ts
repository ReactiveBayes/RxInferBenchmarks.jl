import { describe, expect, it } from "vitest";
import { alignSeries, normalizeValues } from "./align";
import { sampleStats } from "./stats";
import type { SeriesPoint } from "./series";

function point(mean: number, firstSeen: string): SeriesPoint {
  const samples = [mean];
  return {
    fingerprint: `fp-${firstSeen}-${mean}`,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "x",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: [],
    samples,
    stats: sampleStats(samples),
  };
}

describe("alignSeries", () => {
  it("builds a union timeline with nulls where a series has no point", () => {
    const rows = alignSeries({
      gha: [point(1, "2026-06-01"), point(2, "2026-06-08")],
      pi: [point(9, "2026-06-08"), point(10, "2026-06-20")],
    });
    expect(rows.map((r) => r.date)).toEqual(["2026-06-01", "2026-06-08", "2026-06-20"]);
    expect(rows[0].values.gha?.stats.mean).toBe(1);
    expect(rows[0].values.pi).toBeNull(); // pi did not run — never fabricated
    expect(rows[1].values.gha?.stats.mean).toBe(2);
    expect(rows[1].values.pi?.stats.mean).toBe(9);
    expect(rows[2].values.gha).toBeNull();
    expect(rows[2].values.pi?.stats.mean).toBe(10);
  });

  it("handles empty input", () => {
    expect(alignSeries({})).toEqual([]);
  });
});

describe("normalizeValues", () => {
  it("scales to [0, 1]", () => {
    expect(normalizeValues([10, 20, 30])).toEqual([0, 0.5, 1]);
  });

  it("maps a constant series to 0.5 (no divide-by-zero)", () => {
    expect(normalizeValues([7, 7, 7])).toEqual([0.5, 0.5, 0.5]);
  });

  it("handles empty input", () => {
    expect(normalizeValues([])).toEqual([]);
  });
});
