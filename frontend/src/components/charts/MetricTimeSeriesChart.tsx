"use client";

import { Area, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { buildBandRows } from "@/lib/transform/chartData";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";
import { PointTooltip } from "./ChartTooltip";

/**
 * Performance over environment changes: mean line + min–max envelope from
 * pooled samples (variance is always displayed — design/frontend.md).
 */
export function MetricTimeSeriesChart({
  points,
  metric,
  height = 280,
}: {
  points: SeriesPoint[];
  metric: MetricDef;
  height?: number;
}) {
  const rows = buildBandRows(points);
  const color = metricColor(metric.id);
  const totalSamples = points.reduce((acc, p) => acc + p.stats.n, 0);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet for {metric.label}.</p>;
  }

  return (
    <figure aria-label={`${metric.label} over time`}>
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <ComposedChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis dataKey="date" fontSize={11} tickLine={false} />
          <YAxis
            fontSize={11}
            tickLine={false}
            width={70}
            tickFormatter={(value: number) => formatValue(value, metric.unit)}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <PointTooltip point={(payload[0].payload as { point: SeriesPoint }).point} unit={metric.unit} />
              ) : null
            }
          />
          <Area
            dataKey="band"
            stroke="none"
            fill={color}
            fillOpacity={0.15}
            isAnimationActive={false}
            name="min–max"
          />
          <Line
            dataKey="mean"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            isAnimationActive={false}
            name="mean"
          />
        </ComposedChart>
      </ChartContainer>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {rows.length} environment{rows.length === 1 ? "" : "s"} · {totalSamples} samples · shaded band = min–max
      </figcaption>
    </figure>
  );
}
