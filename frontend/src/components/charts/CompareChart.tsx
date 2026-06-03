"use client";

import { Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { seriesColor } from "@/lib/chartTheme";
import { formatDate, formatValue } from "@/lib/format";
import { alignSeries } from "@/lib/transform/align";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";

/**
 * Overlay the same metric across hardware targets or Julia versions on a
 * union timeline. Targets run at different times — gaps stay gaps
 * (connectNulls is intentionally off; design/frontend.md).
 */
export function CompareChart({
  seriesByLabel,
  metric,
  height = 280,
}: {
  seriesByLabel: Record<string, SeriesPoint[]>;
  metric: MetricDef;
  height?: number;
}) {
  const aligned = alignSeries(seriesByLabel);
  const labels = Object.keys(seriesByLabel);
  const rows = aligned.map((row) => ({
    date: formatDate(row.date),
    ...Object.fromEntries(labels.map((label) => [label, row.values[label]?.stats.mean ?? null])),
  }));

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing to compare yet.</p>;
  }

  return (
    <figure aria-label={`${metric.label} comparison`}>
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <LineChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis dataKey="date" fontSize={11} tickLine={false} />
          <YAxis
            fontSize={11}
            tickLine={false}
            width={70}
            tickFormatter={(value: number) => formatValue(value, metric.unit)}
          />
          <Tooltip formatter={(value, name) => [formatValue(Number(value), metric.unit), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {labels.map((label, index) => (
            <Line
              key={label}
              dataKey={label}
              stroke={seriesColor(index)}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {labels.length} series · unaligned timelines keep their gaps
      </figcaption>
    </figure>
  );
}
