"use client";

// TanStack Query hooks over the runtime-fetched data files (design/frontend.md).
// Result files are content-addressed by fingerprint and effectively immutable,
// so staleTime is generous.
import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchJson } from "./fetcher";
import { dataUrl } from "./urls";
import type {
  ExperimentsConfig,
  HardwareConfig,
  IndexEntry,
  MetricsConfig,
  ResultFile,
  ResultsIndex,
} from "./types";

const STALE_MS = 5 * 60 * 1000;

export function useResultsIndex() {
  return useQuery({
    queryKey: ["index"],
    queryFn: () => fetchJson<ResultsIndex>(dataUrl("results/index.json")),
    staleTime: STALE_MS,
  });
}

export function useExperiments() {
  return useQuery({
    queryKey: ["experiments"],
    queryFn: () => fetchJson<ExperimentsConfig>(dataUrl("experiments.json")),
    staleTime: STALE_MS,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => fetchJson<MetricsConfig>(dataUrl("metrics.json")),
    staleTime: STALE_MS,
  });
}

export function useHardware() {
  return useQuery({
    queryKey: ["hardware"],
    queryFn: () => fetchJson<HardwareConfig>(dataUrl("hardware.json")),
    staleTime: STALE_MS,
  });
}

/** Fetch every result file listed in the index (across all hardware/Julia versions). */
export function useResultFiles(entries: IndexEntry[] | undefined) {
  return useQueries({
    queries: (entries ?? []).map((entry) => ({
      queryKey: ["result", entry.file],
      queryFn: () => fetchJson<ResultFile>(dataUrl(`results/${entry.file}`)),
      staleTime: Infinity, // fingerprint files only ever gain samples
    })),
    combine: (results) => ({
      files: results.flatMap((r) => (r.data ? [r.data] : [])),
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
    }),
  });
}

/** Flatten the index into all entries, optionally filtered. */
export function flattenIndexEntries(
  index: ResultsIndex | undefined,
  filter?: { hardwareId?: string },
): IndexEntry[] {
  if (!index) return [];
  return index.hardware
    .filter((hw) => !filter?.hardwareId || hw.id === filter.hardwareId)
    .flatMap((hw) => hw.entries);
}
