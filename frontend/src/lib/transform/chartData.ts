// Pure row-builders feeding the Recharts components — keeping chart components
// thin and the data logic unit-testable.
import { formatDate, scenarioLabel } from "@/lib/format";
import type { ResultFile } from "@/lib/data/types";
import { buildSeries, juliaMinor, listScenarios, type SeriesPoint } from "./series";

export interface BandRow {
  date: string;
  mean: number;
  /** [min, max] envelope of the pooled samples — variance is always displayed. */
  band: [number, number];
  point: SeriesPoint;
}

/** Time-series rows: mean line + min–max envelope per environment fingerprint. */
export function buildBandRows(points: SeriesPoint[]): BandRow[] {
  return [...points]
    .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))
    .map((point) => ({
      date: formatDate(point.firstSeen),
      mean: point.stats.mean,
      band: [point.stats.min, point.stats.max],
      point,
    }));
}

export type PhaseRow = { date: string; fingerprint: string } & Partial<Record<string, number | string>>;

/** Merge per-metric series into one row per fingerprint (stacked phase bars). */
export function buildPhaseRows(seriesByMetric: Record<string, SeriesPoint[]>): PhaseRow[] {
  const byFingerprint = new Map<string, PhaseRow>();
  for (const [metric, points] of Object.entries(seriesByMetric)) {
    for (const point of points) {
      let row = byFingerprint.get(point.fingerprint);
      if (!row) {
        row = { date: formatDate(point.firstSeen), fingerprint: point.fingerprint };
        byFingerprint.set(point.fingerprint, row);
      }
      row[metric] = point.stats.mean;
    }
  }
  return [...byFingerprint.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ScenarioPhaseRow {
  scenario: string;
  /** Humanized params, e.g. "iterations = 10, n = 1000". */
  label: string;
  /** Raw scenario params — drives the keyword filters in the scenario legend. */
  params: Record<string, unknown>;
  /** Metric id -> latest mean (plus the fixed fields above). */
  [key: string]: unknown;
}

/**
 * Scenario comparison within one benchmark: one row per scenario, each metric
 * column holding the mean of that scenario's LATEST environment fingerprint
 * (optionally filtered to a hardware/Julia selection).
 */
export function buildScenarioPhaseRows(
  files: ResultFile[],
  query: {
    experimentId: string;
    metrics: string[];
    hardwareId?: string;
    juliaMinor?: string;
  },
): ScenarioPhaseRow[] {
  const scenarios = listScenarios(files, query.experimentId);
  const rows: ScenarioPhaseRow[] = [];
  for (const { scenario_id, params } of scenarios) {
    const row: ScenarioPhaseRow = { scenario: scenario_id, label: scenarioLabel(params), params };
    let hasData = false;
    for (const metric of query.metrics) {
      const series = buildSeries(files, {
        experimentId: query.experimentId,
        scenarioId: scenario_id,
        metric,
        hardwareId: query.hardwareId,
        juliaMinor: query.juliaMinor,
      });
      const latest = series[series.length - 1];
      if (latest) {
        row[metric] = latest.stats.mean;
        hasData = true;
      }
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

export type EnvironmentPhaseRow = {
  label: string;
  hardwareId: string;
  juliaMinor: string;
} & Partial<Record<string, number | string>>;

/**
 * Differences across hardware × Julia versions for one scenario: one row per
 * combo present in the data, each metric column holding the mean of that
 * combo's LATEST environment fingerprint.
 */
export function buildEnvironmentPhaseRows(
  files: ResultFile[],
  query: { experimentId: string; scenarioId: string; metrics: string[] },
): EnvironmentPhaseRow[] {
  const combos = new Map<string, { hardwareId: string; juliaMinor: string }>();
  for (const file of files) {
    const minor = juliaMinor(file.environment.julia_version);
    combos.set(`${file.hardware_id}::${minor}`, { hardwareId: file.hardware_id, juliaMinor: minor });
  }
  const rows: EnvironmentPhaseRow[] = [];
  for (const { hardwareId, juliaMinor: minor } of [...combos.values()].sort((a, b) =>
    `${a.hardwareId}::${a.juliaMinor}`.localeCompare(`${b.hardwareId}::${b.juliaMinor}`),
  )) {
    const row: EnvironmentPhaseRow = {
      label: `${hardwareId} · Julia ${minor}`,
      hardwareId,
      juliaMinor: minor,
    };
    let hasData = false;
    for (const metric of query.metrics) {
      const series = buildSeries(files, {
        experimentId: query.experimentId,
        scenarioId: query.scenarioId,
        metric,
        hardwareId,
        juliaMinor: minor,
      });
      const latest = series[series.length - 1];
      if (latest) {
        row[metric] = latest.stats.mean;
        hasData = true;
      }
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

export interface DistributionRow {
  date: string;
  value: number;
  fingerprint: string;
}

/** Every pooled sample as its own point — shows the raw spread per fingerprint. */
export function buildDistributionRows(points: SeriesPoint[]): DistributionRow[] {
  return [...points]
    .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))
    .flatMap((point) =>
      point.samples.map((value) => ({
        date: formatDate(point.firstSeen),
        value,
        fingerprint: point.fingerprint,
      })),
    );
}
