# RxInferBenchmarks.jl
A dashboard of rxinfer performance metrics over time

## Static dashboard prototype

The `docs/` folder contains a small static dashboard prototype:

- `docs/index.html` is the page GitHub Pages can serve.
- `docs/style.css` is the visual styling.
- `docs/data.js` is the hand-editable benchmark data.
- `docs/dashboard.js` renders the navigation, controls, SVG chart, and table.

Open `docs/index.html` directly in a browser to test it locally. No build step,
database, or JavaScript package manager is required.

For GitHub Pages, set the repository Pages source to the `docs/` folder.

Each row in `docs/data.js` uses this order:

```text
date, commit, branch, julia, rxinfer, benchmark, scenario, metric, value
```

The chart always uses `date` on the x-axis. Commits are shown only in the
metadata table and point hover text.
