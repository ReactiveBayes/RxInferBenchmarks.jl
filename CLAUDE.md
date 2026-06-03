# RxInferBenchmarks.jl

A benchmark dashboard for [RxInfer.jl](https://github.com/ReactiveBayes/RxInfer.jl): Julia model
benchmarks run on CI across multiple Julia versions and hardware targets, results stored as JSON
in `data/`, visualized by a static Next.js dashboard on GitHub Pages.

Read [IDEA.md](IDEA.md) first — a one-page summary of what we're building and how.

## Layout

| Path                  | What it is                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| `IDEA.md`             | Condensed summary of all design documents                                |
| `design/`             | **Live design documents** — read them before changing anything           |
| `data/`               | Experiment/hardware/metric definitions (YAML) + benchmark results (JSON) |
| `models/<name>/`      | Standalone Julia projects, one per benchmarked model                     |
| `benchmarks/harness/` | Julia orchestrator: spawns model subprocesses, writes/merges results     |
| `frontend/`           | Next.js dashboard (static export → GitHub Pages)                        |

Run `make help` for all commands.

## Hard rules

1. **Frontend stack is fixed**: Next.js (App Router) + Tailwind CSS + shadcn/ui + shadcn charts
   (Recharts), compiled with `output: 'export'` to a static site for GitHub Pages. No other UI
   frameworks, no server-side runtime, no hand-written CSS frameworks. **The build must be fully
   static** — `make frontend-check-static` rejects builds containing dynamically rendered pages,
   and CI enforces it. Charts always display variance (error bands/bars from pooled samples).
2. **TDD is mandatory**: write the test first, then the implementation.
   - Every authored React component has a test (shadcn-generated `components/ui/*` primitives are
     exempt — they are tested upstream).
   - Every Julia function in the harness and models has a test.
   - See [design/testing.md](design/testing.md).
3. **Never edit generated files**: `data/*.json` (and their `data/seed/*.json` mirrors) are
   generated from the `.yml` sources; `data/results/**` is the **REAL** public dataset owned by
   benchmark CI. Edit the `.yml` files and run `make index`. Local benchmark runs (`make bench*`)
   write **only** to the **FAKE seed** tree `data/seed/results/**` — never the public dataset.
   The frontend picks REAL vs. seed via `NEXT_PUBLIC_DATA_BASE_URL`. See
   [design/data.md](design/data.md).
4. **Models follow the uniform contract**: each `models/<name>/` is a standalone Julia project
   exposing a single `run_benchmark(scenario; callbacks)` function, invoked through the shared
   `benchmark.jl` wrapper. See [design/benchmarks.md](design/benchmarks.md).
5. **Design documents are live**: when a design decision changes, update the corresponding
   document in `design/` in the same PR.

## Design documents

- [design/architecture.md](design/architecture.md) — big picture: data flow, CI topology
- [design/benchmarks.md](design/benchmarks.md) — harness, model contract, measurement methodology
- [design/data.md](design/data.md) — schemas: results JSON, fingerprints, pooling, YAML configs
- [design/frontend.md](design/frontend.md) — dashboard: routing, theme, views, chart inventory
- [design/testing.md](design/testing.md) — TDD rules for Julia and TypeScript

## Key commands

```sh
make test            # everything: harness + models + frontend
make bench-smoke     # tiny end-to-end benchmark run (seconds)
make frontend-dev    # dashboard dev server against local data/
make index           # regenerate data/*.json mirrors + rebuild the seed tree (data/seed/)
```
