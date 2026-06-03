// Shared test fixtures mirroring the real schemas produced by benchmarks/harness.
// Two hardware targets with deliberately unaligned timelines and two Julia versions.
import type {
  ExperimentsConfig,
  HardwareConfig,
  MetricsConfig,
  ResultFile,
  ResultsIndex,
} from "@/lib/data/types";

export function makeResultFile(overrides: Partial<ResultFile> = {}): ResultFile {
  return {
    schema_version: 2,
    fingerprint: "aaaa00000001",
    hardware_id: "github-actions-ubuntu",
    environment: {
      hardware_id: "github-actions-ubuntu",
      julia_version: "1.12.6",
      rxinfer_version: "4.6.0",
      os: "linux",
      arch: "x86_64",
      cpu_model: "Test CPU",
      cpu_threads: 4,
      total_memory_bytes: 16_000_000_000,
      dependencies: { RxInfer: "4.6.0", ReactiveMP: "5.7.1", Distributions: "0.25.107" },
    },
    runs: [{ timestamp_utc: "2026-06-01T03:12:00Z", commit: "a1b2c3d", processes: 3 }],
    first_seen_utc: "2026-06-01T03:12:00Z",
    last_seen_utc: "2026-06-01T03:12:00Z",
    experiments: [
      {
        experiment_id: "basic/coin_toss",
        scenarios: [
          {
            scenario_id: "iterations=10__n=1000__seed=42",
            params: { n: 1000, iterations: 10, seed: 42 },
            status: "ok",
            samples: {
              cold_run_ms: [180.0, 184.0, 176.0],
              warm_run_min_ms: [1.5, 1.4, 1.6],
              allocations: [3109, 3109, 3110],
            },
          },
          {
            scenario_id: "iterations=10__n=10000__seed=42",
            params: { n: 10000, iterations: 10, seed: 42 },
            status: "ok",
            samples: {
              cold_run_ms: [380.0, 390.0, 370.0],
              warm_run_min_ms: [8.0, 7.9, 8.2],
              allocations: [31090, 31090, 31091],
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** Second fingerprint on the same hardware, later in time, RxInfer bumped, regressed. */
export function makeNewerResultFile(): ResultFile {
  const base = makeResultFile({
    fingerprint: "aaaa00000002",
    runs: [{ timestamp_utc: "2026-06-08T03:11:00Z", commit: "b2c3d4e", processes: 3 }],
    first_seen_utc: "2026-06-08T03:11:00Z",
    last_seen_utc: "2026-06-08T03:11:00Z",
  });
  base.environment = {
    ...base.environment,
    rxinfer_version: "4.7.0",
    dependencies: { RxInfer: "4.7.0", ReactiveMP: "5.8.0", BayesBase: "1.5.0" },
  };
  base.experiments[0].scenarios[0].samples = {
    cold_run_ms: [200.0, 210.0, 205.0],
    warm_run_min_ms: [2.0, 2.1, 1.9],
    allocations: [3500, 3500, 3501],
  };
  return base;
}

/** A sparse Raspberry Pi file: different hardware, later, only one scenario. */
export function makePiResultFile(): ResultFile {
  const base = makeResultFile({
    fingerprint: "cccc00000001",
    hardware_id: "raspberry-pi-5",
    runs: [{ timestamp_utc: "2026-06-20T10:00:00Z", commit: "c3d4e5f", processes: 3 }],
    first_seen_utc: "2026-06-20T10:00:00Z",
    last_seen_utc: "2026-06-20T10:00:00Z",
  });
  base.environment = { ...base.environment, hardware_id: "raspberry-pi-5", arch: "aarch64" };
  base.experiments[0].scenarios = [base.experiments[0].scenarios[0]];
  base.experiments[0].scenarios[0].samples = {
    cold_run_ms: [900.0, 920.0, 880.0],
    warm_run_min_ms: [7.5, 7.4, 7.7],
    allocations: [3109, 3109, 3110],
  };
  return base;
}

export const fixtureIndex: ResultsIndex = {
  schema_version: 2,
  generated_utc: "2026-06-21T00:00:00Z",
  hardware: [
    {
      id: "github-actions-ubuntu",
      label: "GitHub Actions (ubuntu-latest)",
      julia_versions: ["1.10", "1.12"],
      entries: [
        {
          file: "github-actions-ubuntu/1.12/aaaa00000001.json",
          fingerprint: "aaaa00000001",
          julia_version: "1.12.6",
          rxinfer_version: "4.6.0",
          first_seen_utc: "2026-06-01T03:12:00Z",
          last_seen_utc: "2026-06-01T03:12:00Z",
          run_count: 1,
          sample_count: 3,
        },
        {
          file: "github-actions-ubuntu/1.12/aaaa00000002.json",
          fingerprint: "aaaa00000002",
          julia_version: "1.12.6",
          rxinfer_version: "4.7.0",
          first_seen_utc: "2026-06-08T03:11:00Z",
          last_seen_utc: "2026-06-08T03:11:00Z",
          run_count: 1,
          sample_count: 3,
        },
        {
          file: "github-actions-ubuntu/1.10/bbbb00000001.json",
          fingerprint: "bbbb00000001",
          julia_version: "1.10.9",
          rxinfer_version: "4.6.0",
          first_seen_utc: "2026-06-01T04:00:00Z",
          last_seen_utc: "2026-06-01T04:00:00Z",
          run_count: 1,
          sample_count: 3,
        },
      ],
    },
    {
      id: "raspberry-pi-5",
      label: "Raspberry Pi 5",
      julia_versions: ["1.12"],
      entries: [
        {
          file: "raspberry-pi-5/1.12/cccc00000001.json",
          fingerprint: "cccc00000001",
          julia_version: "1.12.6",
          rxinfer_version: "4.6.0",
          first_seen_utc: "2026-06-20T10:00:00Z",
          last_seen_utc: "2026-06-20T10:00:00Z",
          run_count: 1,
          sample_count: 3,
        },
      ],
    },
  ],
};

export const fixtureExperiments: ExperimentsConfig = {
  version: 1,
  defaults: { processes: 3, seed: 42 },
  experiments: [
    {
      id: "basic/coin_toss",
      model: "coin_toss",
      category: "Basic Examples",
      title: "Coin Toss Model",
      description: "Beta-Bernoulli inference with IID observations.",
      tags: ["basic", "conjugate", "iid"],
    },
    {
      id: "basic/kalman",
      model: "kalman",
      category: "Basic Examples",
      title: "Kalman Filtering and Smoothing",
      description: "Linear Gaussian state-space inference.",
      tags: ["state space"],
    },
    {
      id: "advanced/bsts",
      model: "bsts",
      category: "Advanced Examples",
      title: "Bayesian Structural Time Series",
      description: "Trend + seasonal + regression.",
      tags: ["time series"],
    },
  ],
};

export const fixtureMetrics: MetricsConfig = {
  version: 1,
  metrics: [
    { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
    { id: "warm_run_min_ms", label: "Warm run (min)", unit: "ms", lower_is_better: true },
    { id: "allocations", label: "Allocations", unit: "count", lower_is_better: true },
  ],
};

export const fixtureHardware: HardwareConfig = {
  version: 1,
  hardware: [
    { id: "github-actions-ubuntu", label: "GitHub Actions (ubuntu-latest)", kind: "ci", os: "linux", arch: "x86_64" },
    { id: "raspberry-pi-5", label: "Raspberry Pi 5", kind: "self-hosted", os: "linux", arch: "aarch64" },
  ],
};
