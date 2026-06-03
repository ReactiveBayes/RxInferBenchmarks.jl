import type { SeriesPoint } from "./series";

export type RegressionDirection = "regression" | "improvement" | "flat" | "none";

export interface RegressionResult {
  direction: RegressionDirection;
  /** Signed % change of the latest mean vs the previous mean (raw, not better/worse). */
  pctChange: number;
  latest?: SeriesPoint;
  previous?: SeriesPoint;
}

export interface RegressionOptions {
  lowerIsBetter: boolean;
  /** Absolute % change below which the result is "flat". */
  thresholdPct?: number;
}

/** Compare the latest fingerprint against the previous one (design/frontend.md). */
export function detectRegression(
  points: SeriesPoint[],
  { lowerIsBetter, thresholdPct = 3 }: RegressionOptions,
): RegressionResult {
  if (points.length < 2) return { direction: "none", pctChange: 0 };
  const sorted = [...points].sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  if (previous.stats.mean === 0) return { direction: "none", pctChange: 0, latest, previous };

  const pctChange = ((latest.stats.mean - previous.stats.mean) / previous.stats.mean) * 100;
  if (Math.abs(pctChange) < thresholdPct) {
    return { direction: "flat", pctChange, latest, previous };
  }
  const gotWorse = lowerIsBetter ? pctChange > 0 : pctChange < 0;
  return { direction: gotWorse ? "regression" : "improvement", pctChange, latest, previous };
}
