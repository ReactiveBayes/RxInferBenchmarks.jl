import { describe, expect, it } from "vitest";
import { detectRegression } from "./regression";
import { sampleStats } from "./stats";
import type { SeriesPoint } from "./series";

function point(mean: number, firstSeen: string): SeriesPoint {
  const samples = [mean - 1, mean, mean + 1];
  return {
    fingerprint: `fp-${firstSeen}`,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "github-actions-ubuntu",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: ["a1b2c3d"],
    samples,
    stats: sampleStats(samples),
  };
}

describe("detectRegression", () => {
  it("flags an increase as a regression for lower-is-better metrics", () => {
    const result = detectRegression([point(100, "2026-06-01"), point(120, "2026-06-08")], {
      lowerIsBetter: true,
    });
    expect(result.direction).toBe("regression");
    expect(result.pctChange).toBeCloseTo(20);
  });

  it("flags a decrease as an improvement for lower-is-better metrics", () => {
    const result = detectRegression([point(100, "2026-06-01"), point(80, "2026-06-08")], {
      lowerIsBetter: true,
    });
    expect(result.direction).toBe("improvement");
    expect(result.pctChange).toBeCloseTo(-20);
  });

  it("inverts semantics for higher-is-better metrics", () => {
    const result = detectRegression([point(100, "2026-06-01"), point(120, "2026-06-08")], {
      lowerIsBetter: false,
    });
    expect(result.direction).toBe("improvement");
  });

  it("treats changes inside the threshold as flat", () => {
    const result = detectRegression([point(100, "2026-06-01"), point(101, "2026-06-08")], {
      lowerIsBetter: true,
      thresholdPct: 3,
    });
    expect(result.direction).toBe("flat");
  });

  it("uses the latest two points regardless of input order", () => {
    const result = detectRegression(
      [point(120, "2026-06-08"), point(100, "2026-06-01"), point(90, "2026-05-01")],
      { lowerIsBetter: true },
    );
    expect(result.pctChange).toBeCloseTo(20);
  });

  it("returns none with fewer than two points", () => {
    expect(detectRegression([point(100, "2026-06-01")], { lowerIsBetter: true }).direction).toBe(
      "none",
    );
    expect(detectRegression([], { lowerIsBetter: true }).direction).toBe("none");
  });
});
