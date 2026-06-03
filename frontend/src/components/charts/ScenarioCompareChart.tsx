"use client";

import { useMemo, useState } from "react";
import type { ScenarioPhaseRow } from "@/lib/transform/chartData";
import type { MetricDef } from "@/lib/data/types";
import { PhaseBars } from "./PhaseBars";
import { ScenarioLegend, type ParamFilter, type ScenarioLegendItem } from "./ScenarioLegend";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Compare scenarios within one benchmark: one bar group per scenario from its
 * latest environment. Scenarios get short bold letters on the axis ("A", "B",
 * …); the legend above maps letters to parameters, toggles individual
 * scenarios (shift-click isolates) and groups by parameter keyword (e.g. only
 * mode=smoothing, only n=1000). PhaseBars adds phase toggles, stacked/grouped
 * and log/linear.
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
  const [hiddenScenarios, setHiddenScenarios] = useState<Set<string>>(new Set());
  const [paramFilters, setParamFilters] = useState<Record<string, string>>({});

  // Letters are assigned to ALL scenarios in stable order, independent of filtering.
  const lettered = useMemo(
    () => rows.map((row, index) => ({ ...row, short: LETTERS[index] ?? `#${index + 1}` })),
    [rows],
  );

  // Params that vary across scenarios become "group by" filters (seed never varies meaningfully).
  const filters: ParamFilter[] = useMemo(() => {
    const valuesByKey = new Map<string, Set<string>>();
    for (const row of rows) {
      for (const [key, value] of Object.entries(row.params)) {
        if (key === "seed") continue;
        if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
        valuesByKey.get(key)!.add(String(value));
      }
    }
    return [...valuesByKey.entries()]
      .filter(([, values]) => values.size > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        key,
        values: [...values].sort((a, b) => {
          const na = Number(a);
          const nb = Number(b);
          return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
        }),
        active: paramFilters[key] ?? "all",
      }));
  }, [rows, paramFilters]);

  const matchesFilters = (row: ScenarioPhaseRow) =>
    filters.every(
      (filter) => filter.active === "all" || String(row.params[filter.key]) === filter.active,
    );

  const legendItems: ScenarioLegendItem[] = lettered.map((row) => ({
    scenario: row.scenario,
    short: row.short,
    label: row.label,
    hidden: hiddenScenarios.has(row.scenario),
    filteredOut: !matchesFilters(row),
  }));

  const visibleRows = lettered.filter(
    (row) => matchesFilters(row) && !hiddenScenarios.has(row.scenario),
  );

  const toggleScenario = (scenario: string, isolate: boolean) =>
    setHiddenScenarios((current) => {
      if (isolate) {
        const others = rows.filter((r) => r.scenario !== scenario).map((r) => r.scenario);
        const alreadyIsolated =
          others.every((other) => current.has(other)) && !current.has(scenario);
        return alreadyIsolated ? new Set() : new Set(others);
      }
      const next = new Set(current);
      if (next.has(scenario)) next.delete(scenario);
      else next.add(scenario);
      return next;
    });

  return (
    <div>
      {rows.length > 0 && (
        <ScenarioLegend
          items={legendItems}
          filters={filters}
          onToggle={toggleScenario}
          onFilterChange={(key, value) =>
            setParamFilters((current) => ({ ...current, [key]: value }))
          }
        />
      )}
      <PhaseBars
        rows={visibleRows}
        xKey="short"
        metricDefs={metricDefs}
        ariaLabel="Scenario comparison"
        captionPrefix={`${visibleRows.length}/${rows.length} scenarios (latest environment each)`}
        emptyText="No scenario data for this selection."
        height={height}
        boldTicks
      />
    </div>
  );
}
