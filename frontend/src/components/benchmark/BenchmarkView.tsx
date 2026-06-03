"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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
import { MetricTimeSeriesChart } from "@/components/charts/MetricTimeSeriesChart";
import { PhaseBreakdownChart } from "@/components/charts/PhaseBreakdownChart";
import { SampleDistributionChart } from "@/components/charts/SampleDistributionChart";
import { buildSeries, listMetrics, listScenarios, type SeriesPoint } from "@/lib/transform/series";
import type { ExperimentDef, MetricDef, ResultFile } from "@/lib/data/types";
import { DependencyPanel } from "./DependencyPanel";
import { RecentEntriesTable } from "./RecentEntriesTable";
import { SummaryStrip } from "./SummaryStrip";

const PHASE_METRICS = ["ttfx_ms", "model_creation_ms", "cold_run_ms", "warm_run_median_ms", "iteration_median_ms"];

export function BenchmarkView({
  experiment,
  files,
  allFiles,
  metricDefs,
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
  hardware: string | null;
  julia: string | null;
  metric: string;
  scenario: string;
  onSelect: (update: { metric?: string | null; scenario?: string | null }) => void;
}) {
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

      {scenarios.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Scenario</span>
          <Select
            value={activeScenario}
            onValueChange={(value) => onSelect({ scenario: value })}
          >
            <SelectTrigger size="sm" aria-label="Scenario" className="font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.scenario_id} value={s.scenario_id} className="font-mono text-xs">
                  {s.scenario_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {Object.keys(seriesByMetric).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No benchmark data for this selection yet. It will appear after the next scheduled run.
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryStrip
            seriesByMetric={seriesByMetric}
            metricDefs={metricDefs}
            selectedMetric={activeMetric?.id}
            onSelectMetric={(id) => onSelect({ metric: id === activeMetric?.id ? "all" : id })}
          />

          {activeMetric ? (
            <Tabs defaultValue="trend">
              <TabsList>
                <TabsTrigger value="trend">Trend</TabsTrigger>
                <TabsTrigger value="samples">Samples</TabsTrigger>
                <TabsTrigger value="compare">Compare</TabsTrigger>
                <TabsTrigger value="entries">Entries</TabsTrigger>
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
            <div className="grid gap-4 lg:grid-cols-2">
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
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Time phases</CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseBreakdownChart
                seriesByMetric={Object.fromEntries(
                  Object.entries(seriesByMetric).filter(([id]) => PHASE_METRICS.includes(id)),
                )}
                metricDefs={metricDefs}
              />
            </CardContent>
          </Card>

          {latestEnv && (
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
          )}
        </>
      )}
    </div>
  );
}
