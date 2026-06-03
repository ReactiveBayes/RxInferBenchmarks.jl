"use client";

import { useState } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { buildPhaseRows } from "@/lib/transform/chartData";
import { cn } from "@/lib/utils";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";

/**
 * Where does the time go? Grouped bars of the timing phases (ttfx / model
 * creation / cold / warm / iteration) per environment fingerprint.
 * Phases can be toggled on/off and the scale switched between log (default —
 * phases span orders of magnitude) and linear.
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
  const [hiddenPhases, setHiddenPhases] = useState<Set<string>>(new Set());
  const [logScale, setLogScale] = useState(true); // default log — phases span orders of magnitude

  const rows = buildPhaseRows(seriesByMetric);
  const metrics = metricDefs.filter((m) => m.id in seriesByMetric);
  const visibleMetrics = metrics.filter((m) => !hiddenPhases.has(m.id));

  if (rows.length === 0 || metrics.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No phase data yet.</p>;
  }

  const togglePhase = (id: string) =>
    setHiddenPhases((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <figure aria-label="Phase breakdown per environment">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {metrics.map((metric) => {
          const hidden = hiddenPhases.has(metric.id);
          return (
            <Button
              key={metric.id}
              variant="outline"
              size="sm"
              aria-pressed={!hidden}
              title={`${hidden ? "Show" : "Hide"} ${metric.label}`}
              onClick={() => togglePhase(metric.id)}
              className={cn("h-7 gap-1.5 px-2 text-xs", hidden && "opacity-45")}
            >
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: metricColor(metric.id) }}
              />
              {metric.label}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          aria-pressed={logScale}
          title="Toggle between logarithmic and linear scale"
          onClick={() => setLogScale((v) => !v)}
          className="ml-auto h-7 px-2 text-xs"
        >
          {logScale ? "log scale" : "linear scale"}
        </Button>
      </div>
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis dataKey="date" fontSize={11} tickLine={false} />
          <YAxis
            fontSize={11}
            tickLine={false}
            width={70}
            scale={logScale ? "log" : "linear"}
            domain={logScale ? ["auto", "auto"] : [0, "auto"]}
            allowDataOverflow={false}
            tickFormatter={(value: number) => formatValue(value, "ms")}
          />
          <Tooltip
            formatter={(value, name) => [formatValue(Number(value), "ms"), String(name)]}
            labelClassName="text-xs"
          />
          {visibleMetrics.map((metric) => (
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
        {rows.length} environment{rows.length === 1 ? "" : "s"} ·{" "}
        {visibleMetrics.length}/{metrics.length} phases shown ·{" "}
        {logScale ? "log scale — phases span orders of magnitude" : "linear scale"}
      </figcaption>
    </figure>
  );
}
