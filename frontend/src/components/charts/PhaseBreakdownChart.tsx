"use client";

import { buildPhaseRows } from "@/lib/transform/chartData";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";
import { PhaseBars } from "./PhaseBars";

/**
 * Where does the time go, over time? One bar group per environment
 * fingerprint, one bar per phase (PhaseBars: phase toggles, stacked/grouped,
 * log/linear — defaults grouped + log + all phases).
 */
export function PhaseBreakdownChart({
  seriesByMetric,
  metricDefs,
  height = 280,
}: {
  seriesByMetric: Record<string, SeriesPoint[]>;
  metricDefs: MetricDef[];
  height?: number;
}) {
  const rows = buildPhaseRows(seriesByMetric);
  return (
    <PhaseBars
      rows={rows}
      xKey="date"
      metricDefs={metricDefs}
      ariaLabel="Phase breakdown per environment"
      captionPrefix={`${rows.length} environment${rows.length === 1 ? "" : "s"}`}
      emptyText="No phase data yet."
      height={height}
    />
  );
}
