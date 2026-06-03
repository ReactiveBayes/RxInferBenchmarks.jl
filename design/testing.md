# Testing

> **Living document.** Subject to change; update it when the design changes.

## The rule

**This repository is TDD-driven. This is a hard rule.** Write the failing test first, then the
implementation, then refactor. All functionality must be thoroughly tested:

- **Every Julia function** in the harness and in the model projects has a test.
- **Every authored React component** has a test. The only exemption is shadcn-generated
  primitives in `frontend/src/components/ui/` — they are tested upstream by the shadcn project.
- Pure logic (data transforms, schema handling, fingerprinting, merging) is the highest-value
  test surface — keep it pure and test it exhaustively, including edge cases.

PRs that add untested functionality are incomplete.

## Julia

- `Test` stdlib; each project (`benchmarks/harness`, every `models/<name>`) has its own
  `test/runtests.jl` run via `Pkg.test()`.
- **Harness** tests are fast and RxInfer-free: YAML parsing/validation, matrix expansion,
  deterministic scenario ids, fingerprint stability & sensitivity, merge semantics (3+3=6
  samples, runs log grows, fingerprint mismatch refuses), index idempotency, result validation.
- **Model** tests assert *statistical correctness* on tiny data (posterior recovers known
  parameters, smoothing variance < filtering variance, free energy finite/decreasing where
  applicable) — they gate that the model is wired correctly, not its speed.
- **Smoke test**: the harness spawns a real `models/coin_toss/benchmark.jl` subprocess with a
  tiny scenario (`RXBENCH_SMOKE=1`) and asserts the full contract: exit 0, one JSON object on
  stdout, all metric keys present and positive.

## TypeScript / React

- Vitest + React Testing Library + jsdom; `npm test` in `frontend/`.
- `src/lib/` (data layer + transforms): full unit coverage (~90% lines), fixtures derived from
  the real schemas in [data.md](data.md), including deliberately unaligned multi-hardware
  fixtures.
- Components: behavior-level RTL tests (renders from props/data, user interactions update query
  params, loading skeletons shown while pending, error and empty states). Charts are tested by
  asserting the data/props passed to (mocked) Recharts primitives, not pixel output.
- `renderWithProviders` test util: fresh TanStack `QueryClient` per test, ThemeProvider, mocked
  `next/navigation`.
- Polyfills in test setup: `ResizeObserver`, `matchMedia`.

## CI

`test.yml` runs all of the above on every PR, push to main, and a weekly cron — harness tests,
model tests (Julia version × model matrix), and frontend lint + typecheck + tests. The Pages
deploy is gated on the frontend suite passing, plus the **fully-static build check**
(`npm run check-static` — see [frontend.md](frontend.md)).
