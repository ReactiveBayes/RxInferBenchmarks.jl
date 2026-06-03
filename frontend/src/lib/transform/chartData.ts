// Pure row-builders feeding the Recharts components — keeping chart components
// thin and the data logic unit-testable.
import { formatDate } from "@/lib/format";
import type { ResultFile } from "@/lib/data/types";
import { buildSeries, listScenarios, type SeriesPoint } from "./series";

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

export type ScenarioPhaseRow = { scenario: string } & Partial<Record<string, number | string>>;

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
  for (const { scenario_id } of scenarios) {
    const row: ScenarioPhaseRow = { scenario: scenario_id };
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
