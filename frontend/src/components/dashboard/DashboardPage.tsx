"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { BenchmarkView } from "@/components/benchmark/BenchmarkView";
import { LandingExplainer } from "@/components/landing/LandingExplainer";
import { GlobalOverview } from "@/components/overview/GlobalOverview";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import {
  flattenIndexEntries,
  useExperiments,
  useHardware,
  useMetrics,
  useResultFiles,
  useResultsIndex,
} from "@/lib/data/queries";
import { useSelection } from "@/lib/hooks/useSelection";
import { juliaMinor } from "@/lib/transform/series";

export function DashboardPage() {
  const selection = useSelection();
  const index = useResultsIndex();
  const experiments = useExperiments();
  const metrics = useMetrics();
  useHardware(); // warms the cache for labels; index already carries them
  const entries = useMemo(() => flattenIndexEntries(index.data), [index.data]);
  const results = useResultFiles(entries);

  const isPending = index.isPending || experiments.isPending || metrics.isPending || results.isPending;
  const isError = index.isError || experiments.isError || metrics.isError;

  // Defaults: first hardware that has data; its most recent Julia minor.
  const hardwareList = index.data?.hardware ?? [];
  const activeHardware =
    selection.hardware && hardwareList.some((h) => h.id === selection.hardware)
      ? selection.hardware
      : hardwareList[0]?.id ?? null;
  const juliaVersions = hardwareList.find((h) => h.id === activeHardware)?.julia_versions ?? [];
  const activeJulia =
    selection.julia && juliaVersions.includes(selection.julia)
      ? selection.julia
      : juliaVersions[juliaVersions.length - 1] ?? null;

  const filteredFiles = useMemo(
    () =>
      results.files.filter(
        (file) =>
          (!activeHardware || file.hardware_id === activeHardware) &&
          (!activeJulia || juliaMinor(file.environment.julia_version) === activeJulia),
      ),
    [results.files, activeHardware, activeJulia],
  );

  const activeExperiment = experiments.data?.experiments.find((e) => e.id === selection.benchmark);

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          experiments={experiments.data?.experiments ?? []}
          selected={selection.benchmark}
          onSelect={(id) => selection.select({ benchmark: id, metric: "all", scenario: "all" })}
        />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {isError ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Could not load benchmark data. If you are running locally, generate it with{" "}
                <code className="font-mono">make index</code> and restart the dev server.
              </CardContent>
            </Card>
          ) : isPending ? (
            <div className="space-y-4" aria-label="Loading benchmarks">
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            </div>
          ) : activeExperiment ? (
            <BenchmarkView
              experiment={activeExperiment}
              files={filteredFiles}
              allFiles={results.files}
              metricDefs={metrics.data?.metrics ?? []}
              hardwareList={hardwareList}
              juliaVersions={juliaVersions}
              hardware={activeHardware}
              julia={activeJulia}
              metric={selection.metric}
              scenario={selection.scenario}
              onSelect={selection.select}
            />
          ) : (
            <div className="space-y-8">
              <LandingExplainer />
              <GlobalOverview
                experiments={experiments.data?.experiments ?? []}
                files={filteredFiles}
                metricDefs={metrics.data?.metrics ?? []}
                index={index.data}
                onOpenBenchmark={(id, metric) =>
                  selection.select({ benchmark: id, metric: metric ?? "all" })
                }
              />
            </div>
          )}
          <Footer />
        </main>
      </div>
    </div>
  );
}
