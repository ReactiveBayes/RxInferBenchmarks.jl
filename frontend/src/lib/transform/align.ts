import type { SeriesPoint } from "./series";

export interface AlignedRow {
  date: string;
  /** label -> point at that date, or null when that series did not run then. */
  values: Record<string, SeriesPoint | null>;
}

/**
 * Union-timeline alignment for comparing hardware / Julia versions
 * (design/frontend.md): different targets run at different points in time —
 * gaps stay gaps, alignment is never fabricated.
 */
export function alignSeries(seriesByLabel: Record<string, SeriesPoint[]>): AlignedRow[] {
  const labels = Object.keys(seriesByLabel);
  const dates = new Set<string>();
  for (const label of labels) {
    for (const point of seriesByLabel[label]) dates.add(point.firstSeen);
  }
  return [...dates].sort().map((date) => ({
    date,
    values: Object.fromEntries(
      labels.map((label) => [
        label,
        seriesByLabel[label].find((p) => p.firstSeen === date) ?? null,
      ]),
    ),
  }));
}

/** Min-max scale to [0, 1] for sparkline small-multiples; constant series map to 0.5. */
export function normalizeValues(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}
