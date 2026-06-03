# Frontend

> **Living document.** Subject to change; update it when the design changes.

## Stack (hard rule — see `CLAUDE.md`)

Next.js (App Router, TypeScript) + Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) +
shadcn charts (Recharts). Built with `output: 'export'` into a fully static site, deployed to
GitHub Pages by CI. **TanStack Query (`useQuery`)** for data fetching with shadcn `Skeleton`
loading states. Testing: Vitest + React Testing Library (see [testing.md](testing.md)).

**Fully-static guard**: the build must not contain dynamically rendered pages. `output: 'export'`
already fails on dynamic APIs; in addition `npm run check-static` (run in CI after the build)
verifies the `out/` artifact exists, contains the expected `index.html`/`404.html`/`.nojekyll`,
and contains **no server runtime remnants**. Builds that render dynamic pages are rejected.

## Deployment & data loading

- GitHub Pages **project page** → `basePath`/`assetPrefix` `/RxInferBenchmarks.jl`, enabled when
  `GITHUB_PAGES=true` (CI); local dev stays at `/`. `public/.nojekyll` prevents Jekyll mangling.
- **Data is not bundled.** The app fetches JSON at runtime:
  - prod: `https://raw.githubusercontent.com/<owner>/RxInferBenchmarks.jl/main/data`
  - dev: `/local-data` — a gitignored symlink `frontend/public/local-data → ../../data`,
    created by the `predev` script.
  - switched via `NEXT_PUBLIC_DATA_BASE_URL` in `.env.development` / `.env.production`.
- New benchmark results appear on the live site **without redeploying** (runtime fetch).
- The browser parses **JSON only**; the YAML sources are mirrored to JSON by `make index`.

## Routing

Static content pages are real routes; all *dashboard* state lives in **query params** (the
benchmark/hardware universe is runtime-fetched, so dynamic segments cannot be enumerated at
build time):

| Route                  | Content                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `/`                    | Dashboard. No `b` param → landing explainer + global overview        |
| `/docs/how-it-works`   | Static page: how the benchmark pipeline works end-to-end             |
| `/docs/adding-a-model` | Static page: comprehensive tutorial for adding a new model           |

Query params (via a `useSelection` hook wrapping `useSearchParams` + `router.replace`):
`?b=<experiment_id>&m=<metric|all>&s=<scenario|all>&hw=<hardware_id>&jl=<julia-minor>`
`&cmp=<hardware_id,...>&cmpjl=<julia-minor,...>&view=<timeseries|breakdown|distribution|compare>`

Always use `next/link` (basePath-aware); never raw `<a href="/...">` for internal links.

## Theme — Julia palette on shadcn tokens

Light mode: primary = Julia purple `#9558B2`; categorical chart palette `--chart-1..4` =
purple / green `#389826` / blue `#4063D8` / red `#CB3C33` (+ amber 5th). Red doubles as the
regression signal, green as improvement. Dark mode uses the lighter "Julia dot" pastel variants
on a dark background. Dark/light via `next-themes` (class strategy, default system). Each metric
gets a **stable color** across all views (`chart-theme.ts`).

## Views & charts

**Variance is always displayed.** Every value shown is a statistic over pooled samples, and every
chart makes the spread visible: time series get shaded error bands (mean ± std, or min–max
envelope), bar charts get error bars, summary cards show `value ± std (n samples)`. A single
number without its variance is considered a UI bug.

### Landing (no benchmark selected)
What RxInfer.jl is (reactive message-passing Bayesian inference in Julia), the dashboard's
purpose, links to [docs.rxinfer.com](https://docs.rxinfer.com) and the
[RxInfer repo](https://github.com/ReactiveBayes/RxInfer.jl), links to the two docs pages, and the
global overview below.

### Global overview
- Normalized sparkline small-multiples per benchmark (trends comparable regardless of unit).
- "Top movers": biggest regressions/improvements in the latest environment change.
- Coverage heat-strip: when each hardware × Julia version last ran (visualizes unaligned cadence).

### Per-benchmark
- Header: title, description, tags, category breadcrumb.
- Summary cards per metric: latest value ± std, Δ% badge vs previous fingerprint
  (`lower_is_better`-aware coloring).
- All-metrics small-multiples; single-metric deep dive:
  - **Time series**: x = environment changes (`first_seen_utc`), error bands from pooled samples,
    hover = commit/RxInfer/Julia versions.
  - **Phase breakdown**: stacked/grouped bars (ttfx / model creation / cold / warm) per fingerprint.
  - **Sample distribution**: box/strip of pooled samples for the latest fingerprints (shows noise).
  - **Allocation tracking**: allocation *count* + bytes charts; count regressions flagged like
    timing regressions (counts are near-deterministic — small increases are meaningful).
  - **Recent entries table**: fingerprint, RxInfer ver, Julia ver, n samples, value ± std, Δ%.
  - **Dependency panel**: full dependency list of the selected fingerprint + **diff vs the
    previous fingerprint** — answers "what changed?".

### Comparison
- Hardware overlay: same metric/scenario across ≥2 hardware targets, each on its own actual
  timestamps (gaps where a hardware didn't run — never fabricate alignment).
- Julia version overlay: same hardware, e.g. 1.10 vs 1.12.
- Latest-snapshot grouped bars across hardware / Julia versions; hardware metadata cards.

### Docs pages
- **How it works**: the pipeline end-to-end (models → harness → fingerprints → pooling → CI →
  this dashboard), with diagrams; condensed from `IDEA.md`/`design/`.
- **Adding a model**: comprehensive tutorial — create `models/<name>/` project, implement
  `run_benchmark(scenario; callbacks)`, write the correctness test first (TDD), register in
  `data/experiments.yml`, run `make bench-smoke`, open a PR. Includes a full worked example.

## Data layer (`src/lib/`)

- `data/types.ts` — types mirroring [data.md](data.md) schemas.
- `data/urls.ts` + `data/fetcher.ts` — base-URL resolution; typed `fetchJson` with injectable
  fetch implementation (testability).
- `data/queries.ts` — TanStack Query hooks: `useIndex()`, `useExperiments()`, `useHardware()`,
  `useMetrics()`, `useResultFile(entry)` — cached by file path; result files are immutable-ish
  (merged files change rarely), so generous `staleTime`.
- `transform/` — pure, fully unit-tested: flatten fingerprint files → chart points (x =
  `first_seen_utc`, y = sample stats: mean/median/min/std), regression detection
  (latest vs previous fingerprint), normalization for sparklines, hardware/Julia timeline
  union-alignment (nulls for gaps), nav grouping, dependency diffing.
- Loading states: every data-driven view renders a shadcn `Skeleton` layout while
  `useQuery` is pending, and a friendly error card on failure.

## Testing (hard rule)

Every authored component has an RTL test; shadcn-generated `components/ui/*` are exempt.
Transforms aim for ~90% line coverage. jsdom polyfills for `ResizeObserver`/`matchMedia`;
Recharts' `ResponsiveContainer` mocked to a fixed size; `renderWithProviders` wraps
QueryClientProvider (fresh client per test) + ThemeProvider and mocks `next/navigation`.
