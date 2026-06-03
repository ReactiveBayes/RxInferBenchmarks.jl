"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EnvironmentPhaseRow } from "@/lib/transform/chartData";
import type { MetricDef } from "@/lib/data/types";
import { PhaseBars } from "./PhaseBars";

/**
 * Time-phase differences across hardware × Julia versions for one scenario:
 * one bar group per combo (latest environment each), with toggles to
 * include/exclude combos on top of the shared PhaseBars toggles
 * (phases, stacked/grouped, log/linear).
 */
export function EnvironmentCompareChart({
  rows,
  metricDefs,
  height = 300,
}: {
  rows: EnvironmentPhaseRow[];
  metricDefs: MetricDef[];
  height?: number;
}) {
  const [hiddenCombos, setHiddenCombos] = useState<Set<string>>(new Set());
  const visibleRows = rows.filter((row) => !hiddenCombos.has(row.label));

  const toggleCombo = (label: string) =>
    setHiddenCombos((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <PhaseBars
      rows={visibleRows}
      xKey="label"
      metricDefs={metricDefs}
      ariaLabel="Hardware and Julia comparison"
      captionPrefix={`${visibleRows.length}/${rows.length} hardware × Julia combinations (latest environment each)`}
      emptyText="No data across hardware/Julia versions yet."
      height={height}
      angledTicks
      extraControls={
        rows.length > 1 ? (
          <div
            role="group"
            aria-label="Hardware and Julia combinations"
            className="mb-2 flex flex-wrap items-center gap-1.5"
          >
            {rows.map((row) => {
              const hidden = hiddenCombos.has(row.label);
              return (
                <Button
                  key={row.label}
                  variant="outline"
                  size="sm"
                  aria-pressed={!hidden}
                  title={`${hidden ? "Show" : "Hide"} ${row.label}`}
                  onClick={() => toggleCombo(row.label)}
                  className={cn("h-7 cursor-pointer px-2 text-xs", hidden && "opacity-45")}
                >
                  {row.label}
                </Button>
              );
            })}
          </div>
        ) : null
      }
    />
  );
}
