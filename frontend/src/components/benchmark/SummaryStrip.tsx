"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatValue } from "@/lib/format";
import { detectRegression } from "@/lib/transform/regression";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";
import { RegressionBadge } from "./RegressionBadge";
import { cn } from "@/lib/utils";

/** One card per metric: latest value ± std (n) and Δ% vs the previous fingerprint. */
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((metric) => {
        const points = seriesByMetric[metric.id];
        const latest = points[points.length - 1];
        const regression = detectRegression(points, { lowerIsBetter: metric.lower_is_better });
        return (
          <Card
            key={metric.id}
            role={onSelectMetric ? "button" : undefined}
            aria-label={`${metric.label} summary`}
            title={
              onSelectMetric
                ? selectedMetric === metric.id
                  ? "Click to go back to the all-metrics overview"
                  : `Click to open the detailed ${metric.label} view`
                : undefined
            }
            onClick={() => onSelectMetric?.(metric.id)}
            className={cn(
              "group py-4",
              onSelectMetric && "cursor-pointer transition-colors hover:border-primary/50",
              selectedMetric === metric.id && "border-primary",
            )}
          >
            <CardContent className="px-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <RegressionBadge result={regression} />
              </div>
              <p className="mt-1 font-mono text-xl">{formatValue(latest.stats.mean, metric.unit)}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  ± {formatValue(latest.stats.std, metric.unit)} (n={latest.stats.n})
                </p>
                {onSelectMetric && (
                  <span className="flex items-center text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {selectedMetric === metric.id ? "back to overview" : "details"}
                    <ChevronRight className="size-3.5" />
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
