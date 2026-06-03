# RxInferBenchmarks.jl

Performance benchmarks for [RxInfer.jl](https://github.com/ReactiveBayes/RxInfer.jl), tracked
over time across Julia versions and hardware targets, visualized on a static dashboard:

**https://reactivebayes.github.io/RxInferBenchmarks.jl/**

What's measured per model: time to first inference (compilation), model creation, cold run,
warm run (via [BenchmarkTools.jl](https://github.com/JuliaCI/BenchmarkTools.jl)), per-iteration
time, **allocation counts**, allocated bytes, and GC time — each scenario in 3 fresh Julia
processes for honest cold starts and real variance.

Start here:

- [IDEA.md](IDEA.md) — what we're trying to achieve and how, in one page.
- [design/](design/) — the living design documents.
- [CLAUDE.md](CLAUDE.md) — repo guide + hard rules (stack, TDD, generated files).

## Repository layout

```
design/               living design documents
data/                 experiment/hardware/metric definitions (YAML) + results (JSON)
models/<name>/        standalone Julia project per benchmarked model
benchmarks/harness/   Julia orchestrator (spawns model subprocesses, merges results)
frontend/             Next.js dashboard (static export → GitHub Pages)
```

## Quickstart

Requirements: Julia ≥ 1.10, Node ≥ 20.

```sh
make instantiate     # resolve all Julia projects
make test            # run everything: harness + models + frontend
make bench-smoke     # tiny end-to-end benchmark run (~seconds)
make frontend-dev    # dashboard dev server at http://localhost:3000, reading local data/
```

## All commands

Run `make help` (the default target) for the live list. Summary:

| Command                      | Does                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| `make test`                  | All tests: harness, every model, frontend                          |
| `make test-harness`          | Harness unit tests (fast, no RxInfer)                              |
| `make test-models`           | Every model's correctness tests                                    |
| `make test-model MODEL=x`    | One model's tests (e.g. `MODEL=coin_toss`)                         |
| `make test-frontend`         | Frontend lint + typecheck + vitest suite                           |
| `make bench`                 | Full local benchmark run (writes into `data/results/`)             |
| `make bench-smoke`           | Tiny benchmark run into a temp dir — validates the whole pipeline  |
| `make bench-model MODEL=x`   | Benchmark a single model                                           |
| `make index`                 | Regenerate `data/*.json` mirrors + `data/results/index.json`       |
| `make instantiate`           | `Pkg.instantiate()` for harness + all models                       |
| `make frontend-install`      | `npm ci` in `frontend/`                                            |
| `make frontend-dev`          | Dev server against local `data/` (auto-symlinks + converts YAML)   |
| `make frontend-build`        | Static export build (`frontend/out/`)                              |
| `make frontend-check-static` | Verify the build is fully static (no dynamic pages)                |
| `make frontend-preview`      | Serve the static export locally                                    |
| `make clean`                 | Remove build artifacts                                             |

## How the data flows

1. `data/experiments.yml` defines experiments (model + parameter matrix → scenarios).
2. The harness runs each scenario in **3 fresh Julia processes** and records samples.
3. Results are keyed by an **environment fingerprint** (Julia version + full dependency manifest,
   incl. RxInfer). Unchanged environment → new samples are **pooled** into the existing entry;
   changed environment → a new point appears on the charts. See [design/data.md](design/data.md).
4. Benchmark CI (Mondays, per Julia version, always latest released RxInfer) commits results to
   `data/results/`; the deployed dashboard fetches them at runtime — no redeploy needed.

## Adding a model

Short version (the dashboard has a full tutorial under *Docs → Adding a model*):

1. Create `models/<name>/` as a standalone Julia project exposing
   `run_benchmark(scenario; callbacks)` — port the model from the
   [official RxInfer examples](https://examples.rxinfer.com).
2. Write its correctness test first (`test/runtests.jl`) — TDD is a hard rule.
3. Copy the shared `benchmark.jl` wrapper, adjust the module name.
4. Register the experiment in `data/experiments.yml`.
5. `make test-model MODEL=<name> && make bench-smoke`.

## License

See [LICENSE](LICENSE).
