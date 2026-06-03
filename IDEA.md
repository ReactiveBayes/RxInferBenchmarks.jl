# The Idea

> Condensed version of the [design documents](design/). Read those for details; read this to
> understand what we are trying to achieve and how.

## What

A public, long-running **performance observatory for [RxInfer.jl](https://github.com/ReactiveBayes/RxInfer.jl)**.
We want to see, over time and at a glance, whether RxInfer is getting faster or slower — in
compilation, model creation, inference, per-iteration cost, and memory allocations — across
representative probabilistic models, multiple Julia versions, and multiple hardware targets.

The result is a static dashboard at GitHub Pages, fed by benchmark data committed into this very
repository. No database, no backend.

## Why

Performance regressions in an inference engine are silent: a dependency bump or an innocent
refactor can double allocation counts and nobody notices until users complain. Tracking a fixed
set of models on fixed hardware with a fixed methodology makes such changes visible the week they
happen — and ties them to the exact version/dependency change that caused them.

## How

**Models** (`models/`): each benchmarked model — coin toss (Beta-Bernoulli), Kalman
filtering/smoothing, Gaussian mixture, Bayesian structural time series — is a standalone Julia
project, ported from the official RxInfer examples. Each exposes one function,
`run_benchmark(scenario; callbacks)`, and nothing else.

**Harness** (`benchmarks/harness/`): reads the experiment matrix from `data/experiments.yml`,
and for every scenario spawns **3 fresh Julia processes** (true cold starts → real variance).
Each process measures time-to-first-inference, cold run, then warm runs via **BenchmarkTools.jl**
(time, allocation counts, bytes, GC) and per-phase timings via RxInfer's lightweight
`RxInferBenchmarkCallbacks` (the heavy `trace=true` machinery would perturb the numbers and is
not used).

**Data** (`data/results/`): the unit of data is an **environment fingerprint** — a hash of the
Julia version + the full resolved dependency manifest (including the RxInfer version). One JSON
file per (hardware, Julia minor, fingerprint). If a new run happens in an *unchanged* environment,
its samples are **pooled into the existing file** (3 runs become 6 samples); a new file — and thus
a new point on the charts — appears exactly when the environment changes. That is the meaningful
signal: the x-axis of every chart is "environment changes over time", and error bars come from
pooled samples.

**CI** (`.github/workflows/`): every Monday, benchmarks run on GitHub Actions for several Julia
versions (always against the latest released RxInfer via `Pkg.update()`), and a bot commits the
new/merged result files. Weekly tests keep everything honest. Later, self-hosted runners
(Raspberry Pi and other hardware) add their own result folders — different hardware runs at
different times, and the data format doesn't care.

**Dashboard** (`frontend/`): Next.js + Tailwind + shadcn (static export, Julia-colored theme),
fetching the data at runtime from this repo's `data/` folder on GitHub — so new benchmark results
appear on the live site without redeploying. It offers: a landing page explaining RxInfer, a
global overview (sparklines, top movers, coverage), per-benchmark deep dives (time series with
error bands, phase breakdowns, allocation tracking, sample distributions, dependency diffs
answering "what changed?"), and comparison views across hardware and Julia versions.

**Method**: TDD everywhere — every Julia function and every authored React component is tested.
Design documents in `design/` are live and updated together with the code.
