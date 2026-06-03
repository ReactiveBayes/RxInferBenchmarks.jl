# Benchmarks

> **Living document.** Subject to change; update it when the design changes.

## Principles

1. **Fresh process = honest cold start.** Julia's JIT means in-process repetition cannot measure
   compilation or first-run cost. Every scenario is benchmarked in a **separate Julia process**,
   and each scenario runs in **3 fresh processes** per benchmark run to capture variance.
2. **The harness knows nothing about RxInfer.** It spawns subprocesses, feeds scenario JSON in,
   reads result JSON out. This keeps harness tests fast and dependency-free.
3. **Measure with the right tool for each phase:**
   - *Warm runs*: [BenchmarkTools.jl](https://github.com/JuliaCI/BenchmarkTools.jl) `@benchmark`
     — record minimum and median time, **allocation count** (`trial.allocs`), bytes
     (`trial.memory`), GC time. Allocation counts are near-deterministic, so even small increases
     are meaningful regressions.
   - *Phase timings* (model creation / inference / per-iteration / autostart):
     [`RxInferBenchmarkCallbacks`](https://docs.rxinfer.com/stable/manuals/inference/benchmark-callbacks/)
     passed as `callbacks =` to `infer()`. Lightweight timestamp buffers; stats via
     `RxInfer.get_benchmark_stats`.
   - *Cold / time-to-first-inference*: one-shot `@elapsed` / `@timed` in the fresh process.
   - **`trace = true` (`RxInferTraceCallbacks`) is never used in benchmark runs** — it records
     every message-rule event and is heavy enough to perturb the numbers. It may be exposed
     behind an opt-in diagnostic flag, but never feeds CI data.

## The uniform model contract

Each `models/<name>/` is a standalone Julia project:

```
models/<name>/
├── Project.toml          # deps: RxInfer, BenchmarkTools, JSON3, + model-specific
├── Manifest.toml         # committed (pins for tests); benchmark CI runs Pkg.update() first
├── src/<Name>Model.jl    # the model module
├── benchmark.jl          # shared wrapper (identical across models except module name)
└── test/runtests.jl      # statistical correctness tests on tiny data
```

The model module exposes **one function**:

```julia
run_benchmark(scenario::AbstractDict; callbacks = nothing)
```

It generates data deterministically from `scenario["params"]`, builds the model, and
calls `infer(...; callbacks = callbacks)`, returning the inference result.

**Data generation must use [StableRNGs.jl](https://github.com/JuliaRandom/StableRNGs.jl)**
(`StableRNG(seed)`), never `MersenneTwister` or the default RNG: their streams change between
Julia versions, which would make benchmarks (and statistical correctness tests) see different
data on Julia LTS vs stable. With `StableRNG`, every Julia version and every hardware target
benchmarks **exactly the same data**. Phase timings come from
the `RxInferBenchmarkCallbacks` instance the wrapper passes in — models need no build/run split
and no timing code of their own.

Model implementations are **ported from the official examples** at
[docs.rxinfer.com](https://docs.rxinfer.com) and [examples.rxinfer.com](https://examples.rxinfer.com)
— do not invent model code.

### `benchmark.jl` wrapper protocol

Invoked by the harness as:

```
julia --startup-file=no --project=models/<name> models/<name>/benchmark.jl <scenario.json>
```

- Reads the scenario JSON from `ARGS[1]`.
- Prints **exactly one JSON object to stdout** (the per-process measurement block); all logging
  goes to stderr. Exit code 0 on success.
- Measures, in order: `@elapsed` around `using` + include (`ttfx_ms` component), cold
  `@timed run_benchmark(...)` with a fresh callbacks instance, warm
  `BenchmarkTools.@benchmark run_benchmark(...)`, and extracts phase stats from the callbacks.

## The harness (`benchmarks/harness/`)

A Julia project (deps: YAML, JSON3, SHA; stdlib: Dates, Pkg, TOML). Pure, unit-tested functions
for: config loading/validation, matrix → scenario expansion, deterministic `scenario_id`,
environment collection (Julia version, full dependency manifest, OS/CPU), fingerprint computation,
**result merging (sample pooling)**, result validation, and index building — plus the subprocess
orchestration (`run_scenario`, `run_all`).

CLIs:

- `bin/run_benchmarks.jl` — run all (or selected) experiments, write/merge the result file.
- `bin/build_index.jl` — regenerate `data/results/index.json` and the `data/*.json` mirrors of
  the YAML sources.

Environment variables:

- `RXBENCH_HARDWARE_ID` — required for real runs; must match an entry in `data/hardware.yml`.
- `RXBENCH_SMOKE=1` — overrides matrices with tiny sizes and 1 process; used by tests and CI
  smoke runs (results are written to a temp dir, never committed).

## Numerical validity is a hard gate

Benchmarks of numerically invalid inference are worthless. Model subprocesses always run with

- `JULIA_FASTCHOLESKY_THROW_ERROR_NON_SYMMETRIC=1` — a non-symmetric matrix reaching
  `FastCholesky` is a hard error, never a silent warning,
- `THROW_ON_INFERENCE_ERROR_HINT=true`,

matching RxInfer's own CI (which also sets `USE_DEV=false`, `LOG_USING_RXINFER=false`). The
harness injects these into every benchmark subprocess; CI sets them for model tests too. A model
that cannot run cleanly under these flags must have its data/priors fixed — or be removed.

## Scenarios and experiments

`data/experiments.yml` defines experiments referencing models, either as a cartesian `matrix:`
(e.g. sizes × modes) or an explicit `scenarios:` list. See [data.md](data.md) for the schema.

**The `iterations` dimension only exists where it is meaningful**: variational/VMP models
(mixtures, mean-field Gaussian, BSTS, linear regression with init messages) iterate; closed-form
conjugate models (coin toss) and exact belief propagation (Kalman) converge in a single pass and
have no iterations axis.

## ⚠️ Open questions

- Exact `@autoupdates`/`datastream` form for the Kalman *filtering* scenario (benchmark callbacks
  record `autostart` there instead of inference/iteration timestamps).
- Whether `free_energy = true` is meaningful for the conjugate coin-toss model.
- BSTS may need explicit `@constraints` / `@initialization` for stable convergence; verify
  against the official example.
