// Stable Julia-palette colors per metric/series (design/frontend.md):
// a metric keeps the same color in every view.

const PALETTE_SIZE = 5;

/** Canonical metrics get fixed colors; unknown metrics hash into the palette. */
const FIXED: Record<string, number> = {
  ttfx_ms: 1, // purple
  model_creation_ms: 3, // blue
  cold_run_ms: 4, // red
  warm_run_min_ms: 2, // green
  warm_run_median_ms: 2,
  iteration_median_ms: 5, // amber
  allocations: 1,
  allocated_bytes: 3,
  gc_time_ms: 5,
};

export function seriesColor(index: number): string {
  return `var(--chart-${(index % PALETTE_SIZE) + 1})`;
}

export function metricColor(metricId: string): string {
  const fixed = FIXED[metricId];
  if (fixed) return `var(--chart-${fixed})`;
  let hash = 0;
  for (const char of metricId) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return seriesColor(hash);
}
