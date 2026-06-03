"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompareChart } from "@/components/charts/CompareChart";
import { EnvironmentCompareChart } from "@/components/charts/EnvironmentCompareChart";
import { MetricTimeSeriesChart } from "@/components/charts/MetricTimeSeriesChart";
import { PhaseBreakdownChart } from "@/components/charts/PhaseBreakdownChart";
import { SampleDistributionChart } from "@/components/charts/SampleDistributionChart";
import { ScenarioCompareChart } from "@/components/charts/ScenarioCompareChart";
import { HardwareSwitcher, JuliaSwitcher } from "@/components/layout/Switchers";
import { scenarioLabel } from "@/lib/format";
import { buildEnvironmentPhaseRows, buildScenarioPhaseRows } from "@/lib/transform/chartData";
import { buildSeries, listMetrics, listScenarios, type SeriesPoint } from "@/lib/transform/series";
import type { ExperimentDef, IndexHardware, MetricDef, ResultFile } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { DependencyPanel } from "./DependencyPanel";
import { RecentEntriesTable } from "./RecentEntriesTable";
import { SummaryStrip } from "./SummaryStrip";

const PHASE_METRICS = ["ttfx_ms", "model_creation_ms", "cold_run_ms", "warm_run_median_ms", "iteration_median_ms"];

export function BenchmarkView({
  experiment,
  files,
  allFiles,
  metricDefs,
  hardwareList,
  juliaVersions,
  hardware,
  julia,
  metric,
  scenario,
  onSelect,
}: {
  experiment: ExperimentDef;
  /** Files filtered to the selected hardware + Julia version. */
  files: ResultFile[];
  /** All files (for hardware/Julia comparison). */
  allFiles: ResultFile[];
  metricDefs: MetricDef[];
  /** Hardware available in the index (for the explore-tab switcher). */
  hardwareList: IndexHardware[];
  /** Julia versions available for the selected hardware. */
  juliaVersions: string[];
  hardware: string | null;
  julia: string | null;
  metric: string;
  scenario: string;
  onSelect: (update: {
    metric?: string | null;
    scenario?: string | null;
    hardware?: string | null;
    julia?: string | null;
  }) => void;
}) {
  const [chartColumns, setChartColumns] = useState<2 | 3 | 4>(3);
  const [phasesMode, setPhasesMode] = useState<"history" | "environments">("history");
  const scenarios = useMemo(() => listScenarios(files, experiment.id), [files, experiment.id]);
  const activeScenario =
    scenario !== "all" && scenarios.some((s) => s.scenario_id === scenario)
      ? scenario
      : scenarios[0]?.scenario_id;

  const presentMetricIds = useMemo(() => listMetrics(files, experiment.id), [files, experiment.id]);
  const presentMetrics = metricDefs.filter((m) => presentMetricIds.includes(m.id));

  const seriesByMetric = useMemo(() => {
    if (!activeScenario) return {};
    const result: Record<string, SeriesPoint[]> = {};
    for (const id of presentMetricIds) {
      const series = buildSeries(files, {
        experimentId: experiment.id,
        scenarioId: activeScenario,
        metric: id,
        hardwareId: hardware ?? undefined,
        juliaMinor: julia ?? undefined,
      });
      if (series.length > 0) result[id] = series;
    }
    return result;
  }, [files, experiment.id, activeScenario, presentMetricIds, hardware, julia]);

  const activeMetricId = metric !== "all" && presentMetricIds.includes(metric) ? metric : null;
  const activeMetric = activeMetricId
    ? (presentMetrics.find((m) => m.id === activeMetricId) ?? null)
    : null;

  const latestEnv = useMemo(() => {
    const sorted = [...files].sort((a, b) => a.first_seen_utc.localeCompare(b.first_seen_utc));
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    return latest
      ? {
          label: latest.fingerprint.slice(0, 12),
          current: latest.environment.dependencies,
          previous: previous?.environment.dependencies,
        }
      : null;
  }, [files]);

  const compareByHardware = useMemo(() => {
    if (!activeScenario || !activeMetricId) return {};
    const byHw: Record<string, SeriesPoint[]> = {};
    for (const hwId of [...new Set(allFiles.map((f) => f.hardware_id))]) {
      const series = buildSeries(allFiles, {
        experimentId: experiment.id,
        scenarioId: activeScenario,
        metric: activeMetricId,
        hardwareId: hwId,
        juliaMinor: julia ?? undefined,
      });
      if (series.length > 0) byHw[hwId] = series;
    }
    return byHw;
  }, [allFiles, experiment.id, activeScenario, activeMetricId, julia]);

  const compareByJulia = useMemo(() => {
    if (!activeScenario || !activeMetricId || !hardware) return {};
    const byJulia: Record<string, SeriesPoint[]> = {};
    const minors = [...new Set(allFiles.map((f) => f.environment.julia_version.split(".").slice(0, 2).join(".")))];
    for (const minor of minors.sort()) {
      const series = buildSeries(allFiles, {
        experimentId: experiment.id,
        scenarioId: activeScenario,
        metric: activeMetricId,
        hardwareId: hardware,
        juliaMinor: minor,
      });
      if (series.length > 0) byJulia[`Julia ${minor}`] = series;
    }
    return byJulia;
  }, [allFiles, experiment.id, activeScenario, activeMetricId, hardware]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{experiment.category}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{experiment.title}</h1>
        {experiment.description && (
          <p className="mt-1 text-sm text-muted-foreground">{experiment.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(experiment.tags ?? []).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {Object.keys(seriesByMetric).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No benchmark data for this selection yet. It will appear after the next scheduled run.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="explore" className="gap-4">
          <TabsList className="mb-2 gap-2">
            <TabsTrigger value="explore" className="cursor-pointer px-4">
              Explore individual scenario
            </TabsTrigger>
            {scenarios.length > 1 && (
              <TabsTrigger value="scenarios" className="cursor-pointer px-4">
                Compare scenarios
              </TabsTrigger>
            )}
            <TabsTrigger value="environment" className="cursor-pointer px-4">
              Environment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="space-y-6 pt-1">
          <div className="flex flex-wrap items-end gap-4">
            {scenarios.length > 1 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Scenario</p>
                <Select
                  value={activeScenario}
                  onValueChange={(value) => onSelect({ scenario: value })}
                >
                  <SelectTrigger aria-label="Scenario" className="min-w-56 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s) => (
                      <SelectItem key={s.scenario_id} value={s.scenario_id}>
                        {scenarioLabel(s.params)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {hardwareList.length > 0 && hardware && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Hardware</p>
                <HardwareSwitcher
                  hardware={hardwareList}
                  value={hardware}
                  onChange={(id) => onSelect({ hardware: id, julia: null })}
                />
              </div>
            )}
            {juliaVersions.length > 0 && julia && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Julia version</p>
                <JuliaSwitcher
                  versions={juliaVersions}
                  value={julia}
                  onChange={(version) => onSelect({ julia: version })}
                />
              </div>
            )}
          </div>

          <SummaryStrip
            seriesByMetric={seriesByMetric}
            metricDefs={metricDefs}
            selectedMetric={activeMetric?.id}
            onSelectMetric={(id) => onSelect({ metric: id === activeMetric?.id ? "all" : id })}
          />

          {activeMetric ? (
            <Tabs defaultValue="trend">
              <TabsList className="gap-2">
                <TabsTrigger value="trend" className="cursor-pointer px-4">Trend</TabsTrigger>
                <TabsTrigger value="samples" className="cursor-pointer px-4">Samples</TabsTrigger>
                <TabsTrigger value="compare" className="cursor-pointer px-4">Compare</TabsTrigger>
                <TabsTrigger value="entries" className="cursor-pointer px-4">Entries</TabsTrigger>
              </TabsList>
              <TabsContent value="trend" className="pt-3">
                <MetricTimeSeriesChart points={seriesByMetric[activeMetric.id] ?? []} metric={activeMetric} />
              </TabsContent>
              <TabsContent value="samples" className="pt-3">
                <SampleDistributionChart points={seriesByMetric[activeMetric.id] ?? []} metric={activeMetric} />
              </TabsContent>
              <TabsContent value="compare" className="space-y-6 pt-3">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Across hardware</h3>
                  <CompareChart seriesByLabel={compareByHardware} metric={activeMetric} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Across Julia versions</h3>
                  <CompareChart seriesByLabel={compareByJulia} metric={activeMetric} />
                </div>
              </TabsContent>
              <TabsContent value="entries" className="pt-3">
                <RecentEntriesTable points={seriesByMetric[activeMetric.id] ?? []} metric={activeMetric} />
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              <div
                role="group"
                aria-label="Chart columns"
                className="mb-2 flex items-center justify-end gap-1"
              >
                <span className="mr-1 text-xs text-muted-foreground">columns</span>
                {([2, 3, 4] as const).map((columns) => (
                  <Button
                    key={columns}
                    variant="outline"
                    size="sm"
                    aria-pressed={chartColumns === columns}
                    onClick={() => setChartColumns(columns)}
                    className={cn(
                      "h-7 w-7 px-0 text-xs",
                      chartColumns === columns && "border-primary text-primary",
                    )}
                  >
                    {columns}
                  </Button>
                ))}
              </div>
              <div
                className={cn(
                  "grid gap-4",
                  chartColumns === 2 && "lg:grid-cols-2",
                  chartColumns === 3 && "lg:grid-cols-2 xl:grid-cols-3",
                  chartColumns === 4 && "lg:grid-cols-2 xl:grid-cols-4",
                )}
              >
                {presentMetrics
                  .filter((m) => seriesByMetric[m.id])
                  .map((m) => (
                    <Card key={m.id}>
                      <CardHeader className="pb-0">
                        <CardTitle className="text-sm">{m.label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MetricTimeSeriesChart points={seriesByMetric[m.id]} metric={m} height={180} />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Time phases</CardTitle>
              <div role="group" aria-label="Time phases mode" className="flex items-center gap-1">
                {(
                  [
                    ["history", "history"],
                    ["environments", "hardware & Julia"],
                  ] as const
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    variant="outline"
                    size="sm"
                    aria-pressed={phasesMode === mode}
                    onClick={() => setPhasesMode(mode)}
                    className={cn(
                      "h-7 cursor-pointer px-2 text-xs",
                      phasesMode === mode && "border-primary text-primary",
                    )}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {phasesMode === "history" ? (
                <PhaseBreakdownChart
                  seriesByMetric={Object.fromEntries(
                    Object.entries(seriesByMetric).filter(([id]) => PHASE_METRICS.includes(id)),
                  )}
                  metricDefs={metricDefs}
                />
              ) : (
                <EnvironmentCompareChart
                  rows={
                    activeScenario
                      ? buildEnvironmentPhaseRows(allFiles, {
                          experimentId: experiment.id,
                          scenarioId: activeScenario,
                          metrics: PHASE_METRICS,
                        })
                      : []
                  }
                  metricDefs={metricDefs}
                />
              )}
            </CardContent>
          </Card>
          </TabsContent>

          {scenarios.length > 1 && (
            <TabsContent value="scenarios" className="pt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Time phases across scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScenarioCompareChart
                    rows={buildScenarioPhaseRows(files, {
                      experimentId: experiment.id,
                      metrics: PHASE_METRICS,
                      hardwareId: hardware ?? undefined,
                      juliaMinor: julia ?? undefined,
                    })}
                    metricDefs={metricDefs}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="environment" className="pt-3">
            {latestEnv ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">What changed?</CardTitle>
                </CardHeader>
                <CardContent>
                  <DependencyPanel
                    current={latestEnv.current}
                    previous={latestEnv.previous}
                    currentLabel={latestEnv.label}
                  />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No environment recorded yet.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
