# Architecture

> **Living document.** Subject to change; update it when the design changes.
> Condensed summary: [`../IDEA.md`](../IDEA.md).

## Goal

Track RxInfer.jl performance over time — compilation, model creation, cold/warm inference,
per-iteration cost, allocation counts and bytes — across representative models, multiple Julia
versions, and multiple hardware targets, on a public static dashboard with no database and no
backend.

## Components and data flow

```
data/experiments.yml ──┐
data/hardware.yml ─────┤  (human-edited sources of truth)
data/metrics.yml ──────┘
        │
        ▼
benchmarks/harness  ── spawns 3 fresh Julia processes per scenario ──► models/<name>/benchmark.jl
        │                                                                    (uniform contract)
        ▼
data/results/<hardware-id>/<julia-minor>/<fingerprint12>.json   (created or sample-pooled)
data/results/index.json + data/*.json                           (regenerated wholesale)
        │
        ▼  (committed by benchmark CI; fetched at runtime by the dashboard)
frontend/ (Next.js static export on GitHub Pages)
```

- **`models/<name>/`** — standalone Julia projects (own `Project.toml`/`Manifest.toml`), one per
  benchmarked model. See [benchmarks.md](benchmarks.md).
- **`benchmarks/harness/`** — Julia orchestrator project. Knows nothing about RxInfer; it only
  spawns subprocesses and assembles/merges JSON. See [benchmarks.md](benchmarks.md).
- **`data/`** — YAML sources (human-edited) + generated JSON (machine-read) + results. Holds two
  datasets of identical shape: the **REAL** public results (`data/results/`, CI-owned) and a
  **FAKE seed** dataset (`data/seed/`) for local UI development. See [data.md](data.md).
- **`frontend/`** — Next.js dashboard, static export. Fetches one dataset at runtime, chosen by
  `NEXT_PUBLIC_DATA_BASE_URL`: the deployed site reads the REAL data from
  `raw.githubusercontent.com`; local dev reads the FAKE seed via a symlink. See
  [frontend.md](frontend.md).

## CI topology (`.github/workflows/`)

| Workflow        | Trigger                                                        | Does                                                                   |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `test.yml`      | PR, push to main (ignoring `data/results/**`), weekly cron, manual | Harness tests, model tests (Julia version × model matrix), frontend lint+test |
| `benchmark.yml` | Monday cron, manual **only**                                    | **First runs the full test suite — if any test fails, no benchmarks are recorded.** Then, for each Julia version: `Pkg.update()` models (latest RxInfer), run harness, merge/commit results as bot |
| `pages.yml`     | Push to main touching `frontend/**`, manual                     | Lint + test + static-export build + verify-fully-static + deploy to GitHub Pages |

**Infinite-loop avoidance** (benchmark CI commits to the repo it runs in), three layers:

1. `benchmark.yml` has no `push` trigger — its own commits can never retrigger it.
2. The bot commit message carries `[skip ci]`.
3. `test.yml`'s push trigger ignores `data/results/**` paths.

Data commits do **not** redeploy the frontend — the live site fetches data at runtime, so new
results appear without a rebuild. `pages.yml` only reacts to `frontend/**` changes.

## Multi-hardware, multi-Julia

- Hardware targets are registered in `data/hardware.yml`; a runner identifies itself via the
  `RXBENCH_HARDWARE_ID` env var. GitHub Actions runners now; self-hosted (Raspberry Pi, etc.)
  later — each gets its own results folder, runs on its own schedule, and the data format never
  assumes aligned timelines.
- Benchmarks run for a **fixed list of Julia versions** (currently 1.10, 1.11, 1.12 — extend the
  matrix in `.github/workflows/` when a new minor lands), always against the **latest released
  RxInfer**. Each (hardware, Julia minor) pair has its own results subfolder; the dashboard lets
  users switch and compare.

## Repository conventions

- `make help` lists all commands; the Makefile and README are maintained as first-class docs.
- Generated files (`data/*.json`, `data/results/**`) are never hand-edited.
- All work is TDD ([testing.md](testing.md)).
