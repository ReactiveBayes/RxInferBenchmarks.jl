"use client";

import { Bar, BarChart, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { buildPhaseRows } from "@/lib/transform/chartData";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";

/**
 * Where does the time go? Grouped bars of the timing phases (ttfx / model
 * creation / cold / warm / iteration) per environment fingerprint.
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
  const metrics = metricDefs.filter((m) => m.id in seriesByMetric);

  if (rows.length === 0 || metrics.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No phase data yet.</p>;
  }

  return (
    <figure aria-label="Phase breakdown per environment">
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis dataKey="date" fontSize={11} tickLine={false} />
          <YAxis
            fontSize={11}
            tickLine={false}
            width={70}
            scale="log"
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => formatValue(value, "ms")}
          />
          <Tooltip
            formatter={(value, name) => [formatValue(Number(value), "ms"), String(name)]}
            labelClassName="text-xs"
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {metrics.map((metric) => (
            <Bar
              key={metric.id}
              dataKey={metric.id}
              name={metric.label}
              fill={metricColor(metric.id)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {rows.length} environment{rows.length === 1 ? "" : "s"} · log scale — phases span orders of magnitude
      </figcaption>
    </figure>
  );
}
