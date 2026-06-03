"use client";

import { useState } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ScenarioPhaseRow } from "@/lib/transform/chartData";
import type { MetricDef } from "@/lib/data/types";

/**
 * Compare scenarios within one benchmark (e.g. state-space sizes/modes): one
 * bar group per scenario, one bar per time phase, from each scenario's latest
 * environment. Toggles: per-phase on/off, stacked/grouped, log/linear.
 * Stacked bars force a linear scale (log-stacked bars misrepresent totals).
 */
export function ScenarioCompareChart({
  rows,
  metricDefs,
  height = 300,
}: {
  rows: ScenarioPhaseRow[];
  metricDefs: MetricDef[];
  height?: number;
}) {
  const [hiddenPhases, setHiddenPhases] = useState<Set<string>>(new Set());
  const [stacked, setStacked] = useState(false);
  const [logScale, setLogScale] = useState(true); // default log; ignored while stacked

  const metrics = metricDefs.filter((m) => rows.some((row) => m.id in row));
  const visibleMetrics = metrics.filter((m) => !hiddenPhases.has(m.id));
  const effectiveLog = logScale && !stacked;

  if (rows.length === 0 || metrics.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No scenario data yet.</p>;
  }

  const togglePhase = (id: string) =>
    setHiddenPhases((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <figure aria-label="Scenario comparison">
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
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            aria-pressed={stacked}
            title="Toggle between stacked and grouped bars"
            onClick={() => setStacked((v) => !v)}
            className="h-7 px-2 text-xs"
          >
            {stacked ? "stacked" : "grouped"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={effectiveLog}
            disabled={stacked}
            title={
              stacked
                ? "Stacked bars always use a linear scale"
                : "Toggle between logarithmic and linear scale"
            }
            onClick={() => setLogScale((v) => !v)}
            className="h-7 px-2 text-xs"
          >
            {effectiveLog ? "log scale" : "linear scale"}
          </Button>
        </div>
      </div>
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis dataKey="scenario" fontSize={10} tickLine={false} interval={0} angle={-12} height={48} />
          <YAxis
            fontSize={11}
            tickLine={false}
            width={70}
            scale={effectiveLog ? "log" : "linear"}
            domain={effectiveLog ? ["auto", "auto"] : [0, "auto"]}
            tickFormatter={(value: number) => formatValue(value, "ms")}
          />
          <Tooltip
            formatter={(value, name) => [formatValue(Number(value), "ms"), String(name)]}
            labelClassName="font-mono text-xs"
          />
          {visibleMetrics.map((metric) => (
            <Bar
              key={`${metric.id}-${stacked}`}
              dataKey={metric.id}
              name={metric.label}
              fill={metricColor(metric.id)}
              stackId={stacked ? "phases" : undefined}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        {rows.length} scenario{rows.length === 1 ? "" : "s"} (latest environment each) ·{" "}
        {visibleMetrics.length}/{metrics.length} phases shown · {stacked ? "stacked, linear scale" : effectiveLog ? "grouped, log scale" : "grouped, linear scale"}
      </figcaption>
    </figure>
  );
}
