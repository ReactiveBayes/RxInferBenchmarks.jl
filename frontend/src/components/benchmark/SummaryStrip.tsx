"use client";

import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { metricColor, metricIcon } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { detectRegression } from "@/lib/transform/regression";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";
import { RegressionBadge } from "./RegressionBadge";
import { cn } from "@/lib/utils";

/**
 * Compact square metric tiles: icon + label + latest value ± std (n) and the
 * Δ% badge vs the previous fingerprint. Sized so a wide monitor fits all
 * metrics on one row; overflow wraps. Clicking a tile opens the deep dive.
 */
export function SummaryStrip({
  seriesByMetric,
  metricDefs,
  selectedMetric,
  onSelectMetric,
}: {
  seriesByMetric: Record<string, SeriesPoint[]>;
  metricDefs: MetricDef[];
  selectedMetric?: string;
  onSelectMetric?: (metricId: string) => void;
}) {
  const metrics = metricDefs.filter((m) => (seriesByMetric[m.id] ?? []).length > 0);
  if (metrics.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurements yet.</p>;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
      {metrics.map((metric) => {
        const points = seriesByMetric[metric.id];
        const latest = points[points.length - 1];
        const regression = detectRegression(points, { lowerIsBetter: metric.lower_is_better });
        const selected = selectedMetric === metric.id;
        const Icon = metricIcon(metric.id);
        return (
          <Card
            key={metric.id}
            role={onSelectMetric ? "button" : undefined}
            aria-label={`${metric.label} summary`}
            title={
              onSelectMetric
                ? selected
                  ? "Click to go back to the all-metrics overview"
                  : `Click to open the detailed ${metric.label} view`
                : undefined
            }
            onClick={() => onSelectMetric?.(metric.id)}
            className={cn(
              "group relative aspect-square justify-center gap-1 p-3 text-center",
              onSelectMetric &&
                "cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40",
              selected && "border-primary shadow-md ring-1 ring-primary/30",
            )}
          >
            <div className="absolute right-2 top-2">
              <RegressionBadge result={regression} />
            </div>
            <Icon aria-hidden className="mx-auto size-6" style={{ color: metricColor(metric.id) }} />
            <p className="mt-1 text-xs font-medium text-muted-foreground">{metric.label}</p>
            <p className="font-mono text-lg leading-tight">
              {formatValue(latest.stats.mean, metric.unit)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              ± {formatValue(latest.stats.std, metric.unit)} (n={latest.stats.n})
            </p>
            {onSelectMetric && (
              <span
                className={cn(
                  "mx-auto flex items-center text-[11px] transition-opacity",
                  selected
                    ? "text-primary" // selected: always visible
                    : "text-muted-foreground opacity-0 group-hover:opacity-100",
                )}
              >
                {selected ? "back to overview" : "details"}
                <ChevronRight className="size-3" />
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
