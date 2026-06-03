"use client";

import { useState, type ReactNode } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { metricColor } from "@/lib/chartTheme";
import { formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MetricDef } from "@/lib/data/types";

/**
 * Shared phase bar chart: one bar group per x-category, one bar per time
 * phase. Toggles: per-phase on/off, stacked/grouped, log/linear. Defaults:
 * grouped, log, all phases on. Stacked forces a linear scale (log-stacked
 * bars misrepresent totals). Extra toggle controls can be injected by the
 * parent (e.g. hardware/Julia series toggles).
 */
export function PhaseBars({
  rows,
  xKey,
  metricDefs,
  ariaLabel,
  captionPrefix,
  emptyText,
  height = 300,
  angledTicks = false,
  boldTicks = false,
  extraControls,
}: {
  rows: Record<string, unknown>[];
  xKey: string;
  metricDefs: MetricDef[];
  ariaLabel: string;
  captionPrefix: string;
  emptyText: string;
  height?: number;
  angledTicks?: boolean;
  boldTicks?: boolean;
  extraControls?: ReactNode;
}) {
  const [hiddenPhases, setHiddenPhases] = useState<Set<string>>(new Set());
  const [stacked, setStacked] = useState(false);
  const [logScale, setLogScale] = useState(true); // default log; ignored while stacked

  const metrics = metricDefs.filter((m) => rows.some((row) => m.id in row));
  const visibleMetrics = metrics.filter((m) => !hiddenPhases.has(m.id));
  const effectiveLog = logScale && !stacked;

  if (rows.length === 0 || metrics.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const togglePhase = (id: string, isolate: boolean) =>
    setHiddenPhases((current) => {
      if (isolate) {
        // shift-click: isolate this phase; shift-click again restores all
        const others = metrics.filter((m) => m.id !== id).map((m) => m.id);
        const alreadyIsolated = others.every((other) => current.has(other)) && !current.has(id);
        return alreadyIsolated ? new Set() : new Set(others);
      }
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <figure aria-label={ariaLabel}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {metrics.map((metric) => {
          const hidden = hiddenPhases.has(metric.id);
          return (
            <Button
              key={metric.id}
              variant="outline"
              size="sm"
              aria-pressed={!hidden}
              title={`${hidden ? "Show" : "Hide"} ${metric.label} — shift-click to isolate`}
              onClick={(event) => togglePhase(metric.id, event.shiftKey)}
              className={cn("h-7 cursor-pointer gap-1.5 px-2 text-xs", hidden && "opacity-45")}
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
            className="h-7 cursor-pointer px-2 text-xs"
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
            className="h-7 cursor-pointer px-2 text-xs"
          >
            {effectiveLog ? "log scale" : "linear scale"}
          </Button>
        </div>
      </div>
      {extraControls}
      <ChartContainer config={{}} className="w-full" style={{ height }}>
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8 }}>
          <XAxis
            dataKey={xKey}
            fontSize={boldTicks ? 13 : angledTicks ? 10 : 11}
            fontWeight={boldTicks ? 700 : undefined}
            tickLine={false}
            interval={0}
            angle={angledTicks ? -12 : 0}
            height={angledTicks ? 48 : undefined}
          />
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
            labelClassName="text-xs"
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
      <figcaption className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <p>
          {captionPrefix} · {visibleMetrics.length}/{metrics.length} phases shown ·{" "}
          {stacked ? "stacked, linear scale" : effectiveLog ? "grouped, log scale" : "grouped, linear scale"}
        </p>
        {/* Non-obvious interactions are always documented under the chart (design/frontend.md). */}
        <p>
          help: click a chip to toggle it · <kbd>shift</kbd>-click a phase chip to isolate it ·
          shift-click again to restore all
        </p>
      </figcaption>
    </figure>
  );
}
