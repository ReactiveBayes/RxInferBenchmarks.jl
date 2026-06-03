// TypeScript mirrors of the data schemas in design/data.md.
// The source of truth is the Julia harness (benchmarks/harness) — these types
// must stay in sync with the documents it writes.

/** One run log entry inside a result file. */
export interface RunLogEntry {
  timestamp_utc: string;
  commit: string;
  processes: number;
}

/** The environment block: versions + full dependency manifest + machine info. */
export interface Environment {
  hardware_id: string;
  julia_version: string;
  rxinfer_version: string;
  os: string;
  arch: string;
  cpu_model: string;
  cpu_threads: number;
  total_memory_bytes: number;
  dependencies: Record<string, string>;
}

export type ScenarioStatus = "ok" | "error";

/** Per-scenario pooled samples: metric id -> one value per fresh Julia process. */
export interface ScenarioResult {
  scenario_id: string;
  params: Record<string, unknown>;
  status: ScenarioStatus;
  error?: string;
  samples: Record<string, number[]>;
}

export interface ExperimentResult {
  experiment_id: string;
  scenarios: ScenarioResult[];
}

/** One result file: data/results/<hardware>/<julia-minor>/<fingerprint12>.json */
export interface ResultFile {
  schema_version: number;
  fingerprint: string;
  hardware_id: string;
  environment: Environment;
  runs: RunLogEntry[];
  first_seen_utc: string;
  last_seen_utc: string;
  experiments: ExperimentResult[];
}

/** data/results/index.json */
export interface IndexEntry {
  file: string;
  fingerprint: string;
  julia_version: string;
  rxinfer_version: string;
  first_seen_utc: string;
  last_seen_utc: string;
  run_count: number;
  sample_count: number;
}

export interface IndexHardware {
  id: string;
  label: string;
  julia_versions: string[];
  entries: IndexEntry[];
}

export interface ResultsIndex {
  schema_version: number;
  generated_utc?: string;
  hardware: IndexHardware[];
}

/** data/experiments.json */
export interface ExperimentDef {
  id: string;
  model: string;
  category: string;
  title: string;
  description?: string;
  tags?: string[];
  matrix?: Record<string, unknown[]>;
  scenarios?: { params: Record<string, unknown> }[];
}

export interface ExperimentsConfig {
  version: number;
  defaults?: Record<string, unknown>;
  experiments: ExperimentDef[];
}

/** data/metrics.json */
export interface MetricDef {
  id: string;
  label: string;
  unit: "ms" | "count" | "bytes" | string;
  lower_is_better: boolean;
}

export interface MetricsConfig {
  version: number;
  metrics: MetricDef[];
}

/** data/hardware.json */
export interface HardwareDef {
  id: string;
  label: string;
  kind?: string;
  os?: string;
  arch?: string;
  notes?: string;
}

export interface HardwareConfig {
  version: number;
  hardware: HardwareDef[];
}
