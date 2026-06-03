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

- Served from the **custom domain** `https://benchmarks.rxinfer.com`, which maps to the site
  **root** (`/`) — *not* a GitHub Pages project page. So **no `basePath`/`assetPrefix`**: assets
  and routes resolve from `/` in both local dev and prod. `public/CNAME` (`benchmarks.rxinfer.com`)
  pins the domain across deploys and `public/.nojekyll` prevents Jekyll from mangling `_next/`.
  `npm run check-static` guards against a project-page basePath regression (which would 404 every
  asset on the custom domain and leave the page unstyled).
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

| Route                         | Content                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `/`                           | Dashboard. No `b` param → landing explainer + global overview            |
| `/docs/how-it-works`          | Reference section index: pipeline overview, with a left "Benchmark reference" legend |
| `/docs/how-it-works/<slug>`   | The repository's **living design documents** (`IDEA.md`, `design/*.md`) rendered as pages via react-markdown at build time (`generateStaticParams`); repo-relative `.md` links are rewritten to reference routes |
| `/docs/adding-a-model`        | Static page: comprehensive tutorial for adding a new model               |

Query params (via a `useSelection` hook wrapping `useSearchParams` + `router.replace`):
`?b=<experiment_id>&m=<metric|all>&s=<scenario|all>&hw=<hardware_id>&jl=<julia-minor>`
`&cmp=<hardware_id,...>&cmpjl=<julia-minor,...>&view=<timeseries|breakdown|distribution|compare>`

Always use `next/link` (basePath-aware); never raw `<a href="/...">` for internal links.

## Responsive layout

The dashboard is usable from phone to wide monitor. The persistent left rails
(benchmark sidebar on `/`, the "Benchmark reference" nav on `/docs/how-it-works`)
collapse below their breakpoint into a `Menu`-triggered shadcn `Sheet` drawer
(`MobileNav`); the benchmark sidebar drawer dismisses on selection. The two
primary nav links live in a shared `PrimaryNavLinks` component reused by the
desktop `TopBar` nav and every mobile drawer, so they stay reachable on every
viewport. Wide-only chrome degrades gracefully: tab strips scroll horizontally,
the docs reference nav becomes a scrollable chip row, content padding tightens,
and grids reflow to a single column. Charts are width-fluid via Recharts'
`ResponsiveContainer`.

## Theme — shadcn defaults with light Julia accents

Stay close to **stock shadcn**: the neutral default palette, default Geist font, no decorative
gradients or tinted neutrals. (Previously a fully custom Julia-hued theme; reverted — it looked
worse than the defaults.) The only deviations:

- `--primary` = Julia purple `#9558B2` (lighter "logo dot" `#AA79C1` in dark mode),
- chart palette `--chart-1..4` = Julia purple / green `#389826` / blue `#4063D8` / red `#CB3C33`,
- `--signal-improve` / `--signal-regress` (green/red) for regression badges.

Dark/light via `next-themes` (class strategy, default system). Each metric keeps a **stable
color** across all views (`chartTheme.ts`).

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

Tab navigation per benchmark: **Explore individual scenario | Compare scenarios | Environment**
(the scenarios tab appears only when the benchmark has several scenarios).

**Explore individual scenario**
- Selector row: scenario (humanized labels — `n = 1000, iterations = 10`, never raw ids),
  hardware, and Julia version — all shadcn Selects. Hardware/Julia selection lives in query
  params, so it **persists when jumping between benchmarks**.
- Metric tiles: compact squares with a per-metric lucide icon in the metric's chart color,
  centered label + latest value ± std (n), Δ% badge vs the previous fingerprint
  (`lower_is_better`-aware). Hover float; selected tile is highlighted with a persistent
  "back to overview". Sized so a wide monitor fits all metrics on one row.
- All-metrics small-multiples grid with a 2/3/4 column toggle (default 3); single-metric deep
  dive tabs:
  - **Trend**: x = environment changes (`first_seen_utc`), min–max error band from pooled
    samples, hover = commit/RxInfer/Julia versions.
  - **Samples**: every pooled sample as a dot per fingerprint (shows noise).
  - **Compare**: line overlays across hardware and across Julia versions (union timelines,
    gaps preserved).
  - **Entries**: fingerprint, RxInfer ver, Julia ver, n samples, value ± std, Δ% table.
- **Time phases** card with a mode toggle:
  - *history* — bars per environment fingerprint over time;
  - *hardware & Julia* — bars per hardware × Julia combination (latest environment each),
    with combo include/exclude toggles. Extends the same bar chart rather than adding a page.

**Compare scenarios**
- Time phases across scenarios (latest environment each). Scenarios get short bold letters on
  the axis ("A", "B", …) — raw scenario ids are too long for axis ticks.
- A dedicated **scenario legend** component above the chart maps letters to parameters and is
  interactive: click a scenario to toggle it, shift-click to isolate it, and "group by" selects
  (one per parameter that varies across scenarios) keep only scenarios matching a value — e.g.
  only `mode=smoothing`, or only `n=1000`. Letters stay stable while filtering.

**Environment**
- Dependency panel: full manifest of the latest fingerprint + **diff vs the previous one** —
  answers "what changed?".

### Shared phase bar chart (`PhaseBars`)

All phase bar charts (history, scenario comparison, hardware × Julia comparison) share one
component with uniform controls: per-phase chip toggles (colored swatches), stacked/grouped
toggle, log/linear toggle. Defaults: grouped, log, all phases on. **Stacked forces a linear
scale** — log-stacked bars misrepresent totals. **Shift-click on a phase chip isolates that
phase**; shift-click again restores all.

**Interaction-help rule**: whenever a chart has non-obvious interactions (shift-click,
isolation, etc.), they MUST be documented in a small help line directly under the chart. A
hidden shortcut is considered a UI bug.

### Footer

Every page carries a footer: "Created and maintained by the ReactiveBayes team (GitHub link) ·
made with Claude".

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
