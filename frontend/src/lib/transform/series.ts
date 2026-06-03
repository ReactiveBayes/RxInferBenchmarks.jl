import type { ResultFile } from "@/lib/data/types";
import { sampleStats, type SampleStats } from "./stats";

/**
 * One chart point = one environment fingerprint (design/data.md): the x-axis is
 * "environment changes over time", the spread comes from pooled samples.
 */
export interface SeriesPoint {
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  hardwareId: string;
  juliaVersion: string;
  juliaMinor: string;
  rxinferVersion: string;
  commits: string[];
  samples: number[];
  stats: SampleStats;
}

export interface SeriesQuery {
  experimentId: string;
  scenarioId: string;
  metric: string;
  hardwareId?: string;
  juliaMinor?: string;
}

export function juliaMinor(version: string): string {
  const [major, minor] = version.split(".");
  return `${major}.${minor}`;
}

/** Build a chronologically sorted series of fingerprint points for one metric. */
export function buildSeries(files: ResultFile[], query: SeriesQuery): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const file of files) {
    if (query.hardwareId && file.hardware_id !== query.hardwareId) continue;
    const minor = juliaMinor(file.environment.julia_version);
    if (query.juliaMinor && minor !== query.juliaMinor) continue;
    const experiment = file.experiments.find((e) => e.experiment_id === query.experimentId);
    if (!experiment) continue;
    const scenario = experiment.scenarios.find((s) => s.scenario_id === query.scenarioId);
    if (!scenario || scenario.status !== "ok") continue;
    const samples = scenario.samples[query.metric];
    if (!samples || samples.length === 0) continue;
    points.push({
      fingerprint: file.fingerprint,
      firstSeen: file.first_seen_utc,
      lastSeen: file.last_seen_utc,
      hardwareId: file.hardware_id,
      juliaVersion: file.environment.julia_version,
      juliaMinor: minor,
      rxinferVersion: file.environment.rxinfer_version,
      commits: file.runs.map((r) => r.commit),
      samples,
      stats: sampleStats(samples),
    });
  }
  return points.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
}

/** Unique scenarios (id + params) observed for an experiment, in stable order. */
export function listScenarios(
  files: ResultFile[],
  experimentId: string,
): { scenario_id: string; params: Record<string, unknown> }[] {
  const seen = new Map<string, Record<string, unknown>>();
  for (const file of files) {
    const experiment = file.experiments.find((e) => e.experiment_id === experimentId);
    for (const scenario of experiment?.scenarios ?? []) {
      if (!seen.has(scenario.scenario_id)) seen.set(scenario.scenario_id, scenario.params);
    }
  }
  return [...seen.entries()]
    .map(([scenario_id, params]) => ({ scenario_id, params }))
    .sort((a, b) => a.scenario_id.localeCompare(b.scenario_id));
}

/** Unique metric ids present for an experiment across all files, sorted. */
export function listMetrics(files: ResultFile[], experimentId: string): string[] {
  const metrics = new Set<string>();
  for (const file of files) {
    const experiment = file.experiments.find((e) => e.experiment_id === experimentId);
    for (const scenario of experiment?.scenarios ?? []) {
      for (const metric of Object.keys(scenario.samples)) metrics.add(metric);
    }
  }
  return [...metrics].sort();
}
