# Data

> **Living document.** Subject to change; update it when the design changes.

## Folder layout

```
data/
├── experiments.yml     # human-edited: experiment matrix
├── hardware.yml        # human-edited: hardware registry
├── metrics.yml         # human-edited: metric definitions
├── experiments.json    # generated mirror (frontend reads JSON only)
├── hardware.json       # generated mirror
├── metrics.json        # generated mirror
└── results/
    ├── index.json      # generated manifest — regenerated wholesale, never appended
    └── <hardware-id>/
        └── <julia-minor>/            # e.g. 1.12/
            └── <fingerprint12>.json  # one file per environment fingerprint
```

Humans edit YAML; machines (and the frontend) read JSON. `make index` regenerates all generated
files. Generated files are committed (the deployed frontend fetches them raw from GitHub).

## Environment fingerprint — the unit of data

```
fingerprint = sha256(julia_full_version ⊕ sorted(name => version for all deps of all model projects))
```

(first 12 hex chars used in filenames). The dependency list includes RxInfer itself and is
collected from the *resolved* manifests after `Pkg.update()`.

On every benchmark run, per (hardware, Julia minor):

1. Compute the fingerprint of the freshly resolved environment.
2. If `data/results/<hw>/<julia-minor>/<fp>.json` exists → **merge**: append the new samples to
   each scenario's sample arrays and append an entry to the `runs` log (3 samples become 6, 9, …).
3. Otherwise → create a new file: a new point appears on the dashboard.

Consequences:

- The **x-axis of every chart is environment change**, not wall-clock cadence. A point moves only
  when Julia, RxInfer, or any dependency changes — which is exactly the signal we care about.
- Variance comes from pooled samples (error bars/bands); re-running an unchanged environment
  tightens the estimate instead of cluttering the timeline.
- History is never lost: every contributing run is logged with timestamp + commit + process count.

## Result file schema (`<fingerprint12>.json`)

```jsonc
{
  "schema_version": 2,
  "fingerprint": "a1b2c3d4e5f6",
  "hardware_id": "github-actions-ubuntu",
  "environment": {
    "julia_version": "1.12.6",
    "rxinfer_version": "4.6.0",
    "os": "linux", "arch": "x86_64",
    "cpu_model": "AMD EPYC 7763", "cpu_threads": 4,
    "total_memory_bytes": 16777216000,
    "dependencies": { "RxInfer": "4.6.0", "ReactiveMP": "5.7.1", "...": "..." }   // full resolved list
  },
  "runs": [
    { "timestamp_utc": "2026-06-08T03:12:00Z", "commit": "a1b2c3d", "processes": 3 }
  ],
  "first_seen_utc": "2026-06-08T03:12:00Z",
  "last_seen_utc":  "2026-06-15T03:11:00Z",
  "experiments": [
    {
      "experiment_id": "basic/kalman",
      "scenarios": [
        {
          "scenario_id": "mode=filtering__n=1000",
          "params": { "mode": "filtering", "n": 1000, "seed": 42 },
          "status": "ok",                      // or "error" (+ "error" string field)
          "samples": {                          // arrays grow on merge; 1 entry per fresh process
            "ttfx_ms":             [4210.5, 4180.2, 4250.1],
            "model_creation_ms":   [7.6, 7.4, 7.9],
            "cold_run_ms":         [388.0, 391.2, 385.4],
            "warm_run_min_ms":     [27.8, 27.5, 28.0],
            "warm_run_median_ms":  [28.4, 28.1, 28.6],
            "iteration_median_ms": [2.8, 2.75, 2.82],
            "allocations":         [412035, 412035, 412040],
            "allocated_bytes":     [37827000, 37827000, 37827104],
            "gc_time_ms":          [3.2, 3.0, 3.4]
          }
        }
      ]
    }
  ]
}
```

- `samples` is an **open map** (metric id → number array): adding a metric never breaks old files.
- The frontend derives mean/median/min/std/error bands from the sample arrays.
- `schema_version` guards future migrations.

## `data/results/index.json`

Regenerated wholesale by `bin/build_index.jl` (deterministic, sorted — idempotent; safe against
concurrent runners because data files live in disjoint folders and the index is rebuilt from
whatever is present, with `git pull --rebase` before the CI commit):

```jsonc
{
  "schema_version": 2,
  "generated_utc": "2026-06-08T03:20:00Z",
  "hardware": [
    {
      "id": "github-actions-ubuntu",
      "julia_versions": ["1.10", "1.12"],
      "entries": [
        {
          "file": "github-actions-ubuntu/1.12/a1b2c3d4e5f6.json",
          "fingerprint": "a1b2c3d4e5f6",
          "julia_version": "1.12.6",
          "rxinfer_version": "4.6.0",
          "first_seen_utc": "2026-06-08T03:12:00Z",
          "last_seen_utc": "2026-06-15T03:11:00Z",
          "run_count": 2,
          "sample_count": 6
        }
      ]
    }
  ]
}
```

The frontend bootstraps from `index.json` + the three `data/*.json` mirrors, then lazily fetches
the per-fingerprint files it needs.

## `data/experiments.yml`

```yaml
version: 1
defaults: { processes: 3, seed: 42 }
experiments:
  - id: basic/coin_toss          # must be unique; "category-slug/name"
    model: coin_toss             # -> models/coin_toss
    category: Basic Examples
    title: Coin Toss Model
    description: Beta-Bernoulli inference with IID observations.
    tags: [basic, conjugate, iid]
    matrix:                      # cartesian product -> scenarios
      n: [1000, 10000]
      iterations: [10]
  - id: basic/kalman
    model: kalman
    # ... explicit scenarios when modes differ:
    scenarios:
      - { params: { mode: filtering, n: 1000 } }
      - { params: { mode: smoothing, n: 1000, iterations: 10 } }
```

`scenario_id` is a deterministic slug built from sorted params — the stable join key across
time, hardware, and Julia versions.

## `data/metrics.yml`

```yaml
version: 1
metrics:
  - { id: ttfx_ms,             label: Time to first inference, unit: ms,    lower_is_better: true }
  - { id: model_creation_ms,   label: Model creation,          unit: ms,    lower_is_better: true }
  - { id: cold_run_ms,         label: Cold run,                unit: ms,    lower_is_better: true }
  - { id: warm_run_min_ms,     label: Warm run (min),          unit: ms,    lower_is_better: true }
  - { id: warm_run_median_ms,  label: Warm run (median),       unit: ms,    lower_is_better: true }
  - { id: iteration_median_ms, label: Iteration (median),      unit: ms,    lower_is_better: true }
  - { id: autostart_ms,        label: Autostart (streaming),   unit: ms,    lower_is_better: true }
  - { id: allocations,         label: Allocations,             unit: count, lower_is_better: true }
  - { id: allocated_bytes,     label: Allocated memory,        unit: bytes, lower_is_better: true }
  - { id: gc_time_ms,          label: GC time,                 unit: ms,    lower_is_better: true }
```

## `data/hardware.yml`

```yaml
version: 1
hardware:
  - id: github-actions-ubuntu
    label: GitHub Actions (ubuntu-latest)
    kind: ci                     # ci | self-hosted
    os: linux
    arch: x86_64
    notes: Shared CI runner; absolute numbers noisy, trends meaningful.
```

Runners self-identify via `RXBENCH_HARDWARE_ID`, validated against this registry. Different
hardware runs at different points in time — the format never assumes aligned timelines.
