"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegressionBadge } from "@/components/benchmark/RegressionBadge";
import { Sparkline } from "@/components/charts/Sparkline";
import { metricColor } from "@/lib/chartTheme";
import { formatDate, formatValue } from "@/lib/format";
import { detectRegression, type RegressionResult } from "@/lib/transform/regression";
import { buildSeries, listMetrics, listScenarios, type SeriesPoint } from "@/lib/transform/series";
import type { ExperimentDef, MetricDef, ResultFile, ResultsIndex } from "@/lib/data/types";

/** The headline metric shown on overview sparklines (fall back to whatever exists). */
const HEADLINE_METRIC = "warm_run_min_ms";

interface OverviewEntry {
  experiment: ExperimentDef;
  scenarioId: string;
  metric: MetricDef;
  series: SeriesPoint[];
  regression: RegressionResult;
  /** Metric defs measured for this benchmark (chips on the card). */
  availableMetrics: MetricDef[];
}

export function GlobalOverview({
  experiments,
  files,
  metricDefs,
  index,
  onOpenBenchmark,
}: {
  experiments: ExperimentDef[];
  files: ResultFile[];
  metricDefs: MetricDef[];
  index: ResultsIndex | undefined;
  onOpenBenchmark: (id: string, metric?: string) => void;
}) {
  const entries = useMemo<OverviewEntry[]>(() => {
    const result: OverviewEntry[] = [];
    for (const experiment of experiments) {
      const scenarios = listScenarios(files, experiment.id);
      const scenarioId = scenarios[0]?.scenario_id;
      if (!scenarioId) continue;
      const metric =
        metricDefs.find((m) => m.id === HEADLINE_METRIC) ?? metricDefs[0];
      if (!metric) continue;
      const series = buildSeries(files, {
        experimentId: experiment.id,
        scenarioId,
        metric: metric.id,
      });
      if (series.length === 0) continue;
      const presentIds = listMetrics(files, experiment.id);
      result.push({
        experiment,
        scenarioId,
        metric,
        series,
        regression: detectRegression(series, { lowerIsBetter: metric.lower_is_better }),
        availableMetrics: metricDefs.filter((m) => presentIds.includes(m.id)),
      });
    }
    return result;
  }, [experiments, files, metricDefs]);

  const movers = useMemo(
    () =>
      entries
        .filter((e) => e.regression.direction === "regression" || e.regression.direction === "improvement")
        .sort((a, b) => Math.abs(b.regression.pctChange) - Math.abs(a.regression.pctChange))
        .slice(0, 4),
    [entries],
  );

  if (entries.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No benchmark data loaded yet — results appear here after the first scheduled run.
      </p>
    );
  }

  return (
    <section aria-label="Global overview" className="space-y-6">
      {movers.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Top movers (latest environment change)</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {movers.map((entry) => (
              <Card
                key={entry.experiment.id}
                role="button"
                aria-label={`Open ${entry.experiment.title}`}
                className="cursor-pointer py-3 transition-colors hover:border-primary/50"
                onClick={() => onOpenBenchmark(entry.experiment.id, entry.metric.id)}
              >
                <CardContent className="flex items-center justify-between gap-2 px-4">
                  <div>
                    <p className="text-sm font-medium">{entry.experiment.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.metric.label}</p>
                  </div>
                  <RegressionBadge result={entry.regression} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">All benchmarks — {entries[0].metric.label} trend</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {entries.map((entry) => {
            const latest = entry.series[entry.series.length - 1];
            return (
              <Card
                key={entry.experiment.id}
                role="button"
                aria-label={`Open ${entry.experiment.title} details`}
                className="cursor-pointer gap-2 py-4 transition-all duration-150 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                onClick={() => onOpenBenchmark(entry.experiment.id)}
              >
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    {entry.experiment.title}
                    <RegressionBadge result={entry.regression} />
                  </CardTitle>
                  {entry.experiment.description && (
                    <p className="text-xs leading-snug text-muted-foreground">
                      {entry.experiment.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <Sparkline
                    values={entry.series.map((p) => p.stats.mean)}
                    color={metricColor(entry.metric.id)}
                    label={`${entry.experiment.title} ${entry.metric.label} trend`}
                  />
                  <p className="text-xs text-muted-foreground">
                    latest {formatValue(latest.stats.mean, entry.metric.unit)} ±{" "}
                    {formatValue(latest.stats.std, entry.metric.unit)} · {entry.series.length} env
                    {entry.series.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1" aria-label={`${entry.experiment.title} measured metrics`}>
                    {entry.availableMetrics.map((m) => (
                      <Badge key={m.id} variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {m.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {index && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Coverage</h2>
          <ul className="space-y-1 text-sm" aria-label="Hardware coverage">
            {index.hardware.map((hw) => {
              const lastSeen = hw.entries.map((e) => e.last_seen_utc).sort().at(-1);
              return (
                <li key={hw.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-48 font-medium">{hw.label}</span>
                  {hw.julia_versions.map((v) => (
                    <Badge key={v} variant="outline">
                      Julia {v}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {hw.entries.length} environment{hw.entries.length === 1 ? "" : "s"}
                    {lastSeen ? ` · last run ${formatDate(lastSeen)}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
