"use client";

import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { buildDistributionRows } from "@/lib/transform/chartData";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";

/**
 * The raw spread: every pooled sample as a dot per environment — makes noise
 * visible so a single spike is not misread as a regression.
 */
export function SampleDistributionChart({
  points,
  metric,
  height = 240,
}: {
  points: SeriesPoint[];
  metric: MetricDef;
  height?: number;
}) {
  const rows = buildDistributionRows(points);
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No samples yet.</p>;
  }
  const color = metricColor(metric.id);
  return (
    <figure aria-label={`${metric.label} sample distribution`}>
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <ScatterChart margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} fontSize={11} />
          <YAxis
            dataKey="value"
            type="number"
            fontSize={11}
            width={70}
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => formatValue(value, metric.unit)}
          />
          <Tooltip
            formatter={(value) => [formatValue(Number(value), metric.unit), metric.label]}
          />
          <Scatter data={rows} fill={color} fillOpacity={0.7} isAnimationActive={false} />
        </ScatterChart>
      </ChartContainer>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {rows.length} individual samples — every fresh Julia process is one dot
      </figcaption>
    </figure>
  );
}
