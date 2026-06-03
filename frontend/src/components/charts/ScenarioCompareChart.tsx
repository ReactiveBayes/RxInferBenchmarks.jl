"use client";

import type { ScenarioPhaseRow } from "@/lib/transform/chartData";
import type { MetricDef } from "@/lib/data/types";
import { PhaseBars } from "./PhaseBars";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Compare scenarios within one benchmark (e.g. state-space sizes/modes): one
 * bar group per scenario from its latest environment. Scenarios get short
 * bold letters on the axis ("A", "B", …) with a legend list above mapping
 * each letter to its parameters (PhaseBars: phase toggles, stacked/grouped,
 * log/linear).
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
  const lettered = rows.map((row, index) => ({
    ...row,
    short: LETTERS[index] ?? `#${index + 1}`,
  }));
  return (
    <PhaseBars
      rows={lettered}
      xKey="short"
      metricDefs={metricDefs}
      ariaLabel="Scenario comparison"
      captionPrefix={`${rows.length} scenario${rows.length === 1 ? "" : "s"} (latest environment each)`}
      emptyText="No scenario data yet."
      height={height}
      boldTicks
      extraControls={
        lettered.length > 0 ? (
          <ul aria-label="Scenario legend" className="mb-2 space-y-0.5 text-xs text-muted-foreground">
            {lettered.map((row) => (
              <li key={row.scenario}>
                <span className="font-semibold text-foreground">Scenario {row.short}</span>
                {" : "}
                {row.label}
              </li>
            ))}
          </ul>
        ) : null
      }
    />
  );
}
