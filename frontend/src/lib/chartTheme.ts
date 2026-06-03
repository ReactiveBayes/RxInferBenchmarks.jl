// Stable Julia-palette colors and icons per metric/series (design/frontend.md):
// a metric keeps the same color and icon in every view.
import {
  Activity,
  Boxes,
  Flame,
  Gauge,
  Hammer,
  MemoryStick,
  Play,
  Recycle,
  Repeat,
  Rocket,
  Snowflake,
  type LucideIcon,
} from "lucide-react";

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

const ICONS: Record<string, LucideIcon> = {
  ttfx_ms: Rocket,
  model_creation_ms: Hammer,
  cold_run_ms: Snowflake,
  warm_run_min_ms: Flame,
  warm_run_median_ms: Gauge,
  iteration_median_ms: Repeat,
  allocations: Boxes,
  allocated_bytes: MemoryStick,
  gc_time_ms: Recycle,
  autostart_ms: Play,
};

export function metricIcon(metricId: string): LucideIcon {
  return ICONS[metricId] ?? Activity;
}
