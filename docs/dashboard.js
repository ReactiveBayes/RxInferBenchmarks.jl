(() => {
  const raw = window.RXINFER_DASHBOARD_DATA || {};
  const columns = [
    "date",
    "commit",
    "branch",
    "julia",
    "rxinfer",
    "benchmark",
    "scenario",
    "metric",
    "value"
  ];

  const colors = [
    "#006d77",
    "#b23a48",
    "#7a4ea3",
    "#ad6500",
    "#287a4d",
    "#3d5368"
  ];
  const ALL_METRICS = "all";

  const data = {
    generatedAt: raw.generatedAt,
    metrics: raw.metrics || [],
    benchmarks: raw.benchmarks || [],
    records: (raw.records || []).map(normalizeRecord).filter((record) => {
      return record.date && record.benchmark && record.metric && Number.isFinite(record.value);
    })
  };

  const metricById = new Map(data.metrics.map((metric) => [metric.id, metric]));
  const benchmarkById = new Map(data.benchmarks.map((benchmark) => [benchmark.id, benchmark]));

  const initialBenchmarkId = readBenchmarkFromHash();
  const state = {
    benchmarkId:
      initialBenchmarkId && benchmarkById.has(initialBenchmarkId)
        ? initialBenchmarkId
        : data.benchmarks[0] && data.benchmarks[0].id,
    metricId: ALL_METRICS,
    scenario: "all",
    search: ""
  };

  const elements = {
    nav: document.getElementById("benchmark-nav"),
    search: document.getElementById("benchmark-search"),
    breadcrumb: document.getElementById("breadcrumb"),
    title: document.getElementById("benchmark-title"),
    description: document.getElementById("benchmark-description"),
    generatedAt: document.getElementById("generated-at"),
    metricControls: document.getElementById("metric-controls"),
    scenarioControls: document.getElementById("scenario-controls"),
    chartTitle: document.getElementById("chart-title"),
    chartSubtitle: document.getElementById("chart-subtitle"),
    summaryStrip: document.getElementById("summary-strip"),
    chart: document.getElementById("chart"),
    runsTable: document.getElementById("runs-table"),
    details: document.getElementById("benchmark-details")
  };

  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderNav();
  });

  window.addEventListener("hashchange", () => {
    const id = readBenchmarkFromHash();
    if (id && benchmarkById.has(id)) {
      state.benchmarkId = id;
      state.scenario = "all";
      ensureMetricIsAvailable();
      render();
    }
  });

  render();

  function normalizeRecord(row) {
    if (Array.isArray(row)) {
      return columns.reduce((record, key, index) => {
        record[key] = row[index];
        if (key === "value") record[key] = Number(row[index]);
        return record;
      }, {});
    }
    return { ...row, value: Number(row.value) };
  }

  function render() {
    renderGeneratedAt();
    renderNav();
    renderBenchmarkHeader();
    renderControls();
    renderSummary();
    renderChart();
    renderTable();
    renderDetails();
  }

  function renderGeneratedAt() {
    const date = data.generatedAt ? formatDateTime(data.generatedAt) : "Unknown";
    const latest = latestRecordForBenchmark(state.benchmarkId);
    elements.generatedAt.innerHTML = `
      <div>Generated ${escapeHtml(date)}</div>
      ${
        latest
          ? `<div>Latest run ${escapeHtml(formatDate(latest.date))}</div>
             <div class="commit">${escapeHtml(latest.commit || "")}</div>`
          : ""
      }
    `;
  }

  function renderNav() {
    const filtered = data.benchmarks.filter((benchmark) => {
      if (!state.search) return true;
      const haystack = [
        benchmark.title,
        benchmark.category,
        benchmark.description,
        ...(benchmark.tags || [])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(state.search);
    });

    const groups = groupBy(filtered, (benchmark) => benchmark.category || "Benchmarks");
    elements.nav.innerHTML = Array.from(groups.entries())
      .map(([category, benchmarks]) => {
        const items = benchmarks
          .map((benchmark) => {
            const active = benchmark.id === state.benchmarkId ? " active" : "";
            return `
              <button class="benchmark-button${active}" data-benchmark="${escapeAttr(benchmark.id)}">
                <div class="benchmark-name">${escapeHtml(benchmark.title)}</div>
                <div class="benchmark-tags">${escapeHtml((benchmark.tags || []).join(", "))}</div>
              </button>
            `;
          })
          .join("");
        return `
          <section class="category">
            <h2 class="category-title">${escapeHtml(category)}</h2>
            ${items}
          </section>
        `;
      })
      .join("");

    elements.nav.querySelectorAll("[data-benchmark]").forEach((button) => {
      button.addEventListener("click", () => {
        state.benchmarkId = button.dataset.benchmark;
        state.scenario = "all";
        ensureMetricIsAvailable();
        history.replaceState(null, "", `#${encodeURIComponent(state.benchmarkId)}`);
        render();
      });
    });
  }

  function renderBenchmarkHeader() {
    const benchmark = currentBenchmark();
    elements.breadcrumb.textContent = benchmark.category || "Benchmarks";
    elements.title.textContent = benchmark.title || benchmark.id;
    elements.description.textContent = benchmark.description || "";
  }

  function renderControls() {
    const availableMetricIds = new Set(recordsForBenchmark().map((record) => record.metric));
    const metrics = data.metrics.filter((metric) => availableMetricIds.has(metric.id));
    if (state.metricId !== ALL_METRICS && !metrics.some((metric) => metric.id === state.metricId)) {
      state.metricId = ALL_METRICS;
    }

    elements.metricControls.innerHTML = [
      `<button class="${state.metricId === ALL_METRICS ? "active" : ""}" data-metric="${ALL_METRICS}">All</button>`,
      ...metrics.map((metric) => {
        const active = metric.id === state.metricId ? " active" : "";
        return `<button class="${active}" data-metric="${escapeAttr(metric.id)}">${escapeHtml(metric.label)}</button>`;
      })
    ].join("");

    elements.metricControls.querySelectorAll("[data-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        state.metricId = button.dataset.metric;
        renderSummary();
        renderChart();
        renderTable();
        renderDetails();
      });
    });

    const scenarios = unique(recordsForBenchmark().map((record) => record.scenario)).sort();
    elements.scenarioControls.innerHTML = [
      `<button class="${state.scenario === "all" ? "active" : ""}" data-scenario="all">All</button>`,
      ...scenarios.map((scenario) => {
        const active = scenario === state.scenario ? " active" : "";
        return `<button class="${active}" data-scenario="${escapeAttr(scenario)}">${escapeHtml(scenario)}</button>`;
      })
    ].join("");

    elements.scenarioControls.querySelectorAll("[data-scenario]").forEach((button) => {
      button.addEventListener("click", () => {
        state.scenario = button.dataset.scenario;
        renderSummary();
        renderChart();
        renderTable();
        renderDetails();
      });
    });
  }

  function renderSummary() {
    if (state.metricId === ALL_METRICS) {
      elements.summaryStrip.innerHTML = "";
      return;
    }

    const entries = summaryEntries();
    if (!entries.length) {
      elements.summaryStrip.innerHTML = `<div class="empty">No summary data for this selection.</div>`;
      return;
    }
    elements.summaryStrip.innerHTML = entries
      .map(({ metric, scenario, latest, previous }) => {
        const change = previous ? percentChange(previous.value, latest.value) : null;
        const trendClass = changeClass(change, metric);
        const trendText = change === null ? "No previous value" : `${formatSigned(change)}% from previous run`;
        const label = state.metricId === ALL_METRICS ? `${metric.label} - ${scenario}` : scenario;
        return `
          <div class="summary-item">
            <div class="summary-label">${escapeHtml(label)}</div>
            <div class="summary-value">${escapeHtml(formatValue(latest.value, metric))}</div>
            <div class="summary-change ${trendClass}">${escapeHtml(trendText)}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderChart() {
    const benchmark = currentBenchmark();
    if (state.metricId === ALL_METRICS) {
      elements.chartTitle.textContent = "All metrics over time";
      elements.chartSubtitle.textContent = `${benchmark.title} by calendar date`;
      renderMetricOverviewCharts();
      return;
    }

    const metric = currentMetric();
    elements.chartTitle.textContent = `${metric.label} over time`;
    elements.chartSubtitle.textContent = `${benchmark.title} by calendar date`;
    elements.chart.innerHTML = renderMetricChart(metric, seriesForMetric(metric.id), { height: 380 });
  }

  function renderTable() {
    const records = sortByDateDesc(
      recordsForBenchmark().filter((record) => {
        if (state.scenario !== "all" && record.scenario !== state.scenario) return false;
        return state.metricId === ALL_METRICS || record.metric === state.metricId;
      })
    ).slice(0, state.metricId === ALL_METRICS ? 25 : 14);

    if (!records.length) {
      elements.runsTable.innerHTML = `
        <tr>
          <td colspan="5">No recent values for this selection.</td>
        </tr>
      `;
      return;
    }

    elements.runsTable.innerHTML = records
      .map((record) => {
        const metric = metricById.get(record.metric) || currentMetric();
        return `
          <tr>
            <td>${escapeHtml(formatDate(record.date))}</td>
            <td>${escapeHtml(record.scenario)}</td>
            <td>${escapeHtml(metric.label)}</td>
            <td class="value-cell">${escapeHtml(formatValue(record.value, metric))}</td>
            <td class="commit">${escapeHtml(record.commit || "")}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderDetails() {
    const benchmark = currentBenchmark();
    const metric = currentMetric();
    const latest = latestRecordForBenchmark(state.benchmarkId);
    const scenarios = unique(recordsForBenchmark().map((record) => record.scenario)).sort();
    const tags = (benchmark.tags || [])
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");

    elements.details.innerHTML = `
      <dt>Category</dt>
      <dd>${escapeHtml(benchmark.category || "")}</dd>
      <dt>Id</dt>
      <dd class="commit">${escapeHtml(benchmark.id)}</dd>
      <dt>Metric</dt>
      <dd>${escapeHtml(metric.label)}${metric.unit ? ` (${escapeHtml(metric.unit)})` : ""}</dd>
      <dt>Scenarios</dt>
      <dd>${escapeHtml(scenarios.join(", "))}</dd>
      <dt>Latest</dt>
      <dd>${latest ? `${escapeHtml(formatDate(latest.date))}, ${escapeHtml(latest.commit || "")}` : "No runs"}</dd>
      <dt>Tags</dt>
      <dd><div class="tag-list">${tags}</div></dd>
    `;
  }

  function seriesForCurrentSelection() {
    return seriesForMetric(state.metricId);
  }

  function seriesForMetric(metricId) {
    const matching = recordsForBenchmark().filter((record) => {
      if (record.metric !== metricId) return false;
      if (state.scenario !== "all" && record.scenario !== state.scenario) return false;
      return true;
    });
    return groupBy(matching, (record) => record.scenario);
  }

  function renderMetricOverviewCharts() {
    const availableMetricIds = new Set(recordsForBenchmark().map((record) => record.metric));
    const metrics = data.metrics.filter((metric) => availableMetricIds.has(metric.id));
    const cards = metrics
      .map((metric) => {
        const stats = metricLatestStats(metric);
        return `
          <section class="overview-card">
            <div class="overview-card-header">
              <div>
                <div class="overview-card-title">${escapeHtml(metric.label)}</div>
                <div class="overview-card-unit">${escapeHtml(metric.unit)}</div>
              </div>
              <div class="overview-stats">
                ${stats}
              </div>
            </div>
            ${renderMetricChart(metric, seriesForMetric(metric.id), { height: 310, compact: true, hideLegend: true })}
          </section>
        `;
      })
      .join("");

    elements.chart.innerHTML = cards
      ? `<div class="overview-grid">${cards}</div>`
      : `<div class="empty">No metric data for this benchmark.</div>`;
  }

  function renderMetricChart(metric, series, options = {}) {
    const allRecords = Array.from(series.values()).flat();
    if (!allRecords.length) {
      return `<div class="empty">No data for ${escapeHtml(metric.label)}.</div>`;
    }

    const width = 920;
    const height = options.height || 380;
    const margin = options.compact
      ? { top: 18, right: 24, bottom: 42, left: 66 }
      : { top: 24, right: 28, bottom: 48, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const dates = allRecords.map((record) => dateValue(record.date));
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const values = allRecords.map((record) => record.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padded = paddedDomain(minValue, maxValue);
    const yTicks = tickValues(padded.min, padded.max, options.compact ? 4 : 5);
    const xTicks = pickDateTicks(unique(allRecords.map((record) => record.date)).sort());

    const x = (date) => {
      if (minDate === maxDate) return margin.left + plotWidth / 2;
      return margin.left + ((dateValue(date) - minDate) / (maxDate - minDate)) * plotWidth;
    };

    const y = (value) => {
      if (padded.min === padded.max) return margin.top + plotHeight / 2;
      return margin.top + plotHeight - ((value - padded.min) / (padded.max - padded.min)) * plotHeight;
    };

    const grid = yTicks
      .map((tick) => {
        const yy = y(tick);
        return `
          <line class="grid-line" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
          <text class="axis-label" x="${margin.left - 10}" y="${yy + 4}" text-anchor="end">${escapeHtml(formatAxisValue(tick, metric))}</text>
        `;
      })
      .join("");

    const xAxis = xTicks
      .map((date) => {
        const xx = x(date);
        return `
          <line class="axis-line" x1="${xx}" y1="${height - margin.bottom}" x2="${xx}" y2="${height - margin.bottom + 5}"></line>
          <text class="axis-label" x="${xx}" y="${height - margin.bottom + 24}" text-anchor="middle">${escapeHtml(shortDate(date))}</text>
        `;
      })
      .join("");

    const paths = Array.from(series.entries())
      .map(([scenario, records], index) => {
        const color = colors[index % colors.length];
        const sorted = sortByDate(records);
        const path = sorted
          .map((record, pointIndex) => {
            const command = pointIndex === 0 ? "M" : "L";
            return `${command} ${x(record.date).toFixed(2)} ${y(record.value).toFixed(2)}`;
          })
          .join(" ");
        const points = sorted
          .map((record) => {
            const title = [
              scenario,
              formatDate(record.date),
              `${metric.label}: ${formatValue(record.value, metric)}`,
              `commit ${record.commit || "unknown"}`,
              `Julia ${record.julia || "unknown"}`
            ].join("\n");
            return `
              <circle class="series-point" cx="${x(record.date).toFixed(2)}" cy="${y(record.value).toFixed(2)}" r="${options.compact ? 4 : 4.5}" fill="${color}">
                <title>${escapeHtml(title)}</title>
              </circle>
            `;
          })
          .join("");
        return `
          ${sorted.length > 1 ? `<path class="series-line" d="${path}" stroke="${color}"></path>` : ""}
          ${points}
        `;
      })
      .join("");

    const legend = Array.from(series.keys())
      .map((scenario, index) => {
        const color = colors[index % colors.length];
        return `
          <span class="legend-item">
            <span class="legend-swatch" style="background:${color}"></span>
            ${escapeHtml(scenario)}
          </span>
        `;
      })
      .join("");

    return `
      <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
        ${grid}
        <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"></line>
        <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"></line>
        ${xAxis}
        ${paths}
      </svg>
      ${options.hideLegend ? "" : `<div class="chart-legend">${legend}</div>`}
    `;
  }

  function recordsForBenchmark() {
    return data.records.filter((record) => record.benchmark === state.benchmarkId);
  }

  function currentBenchmark() {
    return benchmarkById.get(state.benchmarkId) || data.benchmarks[0] || {};
  }

  function currentMetric() {
    if (state.metricId === ALL_METRICS) return { label: "All metrics", unit: "", lowerIsBetter: true };
    return metricById.get(state.metricId) || data.metrics[0] || { label: "Metric", unit: "" };
  }

  function ensureMetricIsAvailable() {
    if (state.metricId === ALL_METRICS) return;
    const metricIds = new Set(recordsForBenchmark().map((record) => record.metric));
    if (!metricIds.has(state.metricId)) {
      state.metricId = ALL_METRICS;
    }
  }

  function summaryEntries() {
    const metricIds = state.metricId === ALL_METRICS ? data.metrics.map((metric) => metric.id) : [state.metricId];
    return metricIds.flatMap((metricId) => {
      const metric = metricById.get(metricId);
      if (!metric) return [];
      return Array.from(seriesForMetric(metricId).entries()).map(([scenario, records]) => {
        const sorted = sortByDate(records);
        return {
          metric,
          scenario,
          latest: sorted[sorted.length - 1],
          previous: sorted[sorted.length - 2]
        };
      });
    });
  }

  function metricLatestStats(metric) {
    const entries = Array.from(seriesForMetric(metric.id).entries());
    if (!entries.length) return `<span class="overview-stat-empty">No recent value</span>`;

    return entries
      .map(([scenario, records]) => {
        const sorted = sortByDate(records);
        const latest = sorted[sorted.length - 1];
        const previous = sorted[sorted.length - 2];
        const change = previous ? percentChange(previous.value, latest.value) : null;
        const trendClass = changeClass(change, metric);
        const trendText = change === null ? "" : `${formatSigned(change)}%`;
        return `
          <div class="overview-stat">
            <div class="overview-stat-label">${escapeHtml(scenario)}</div>
            <div class="overview-stat-value">${escapeHtml(formatValue(latest.value, metric))}</div>
            <div class="overview-stat-change ${trendClass}">${escapeHtml(trendText)}</div>
          </div>
        `;
      })
      .join("");
  }

  function latestRecordForBenchmark(benchmarkId) {
    const records = sortByDateDesc(data.records.filter((record) => record.benchmark === benchmarkId));
    return records[0];
  }

  function groupBy(items, keyFn) {
    const groups = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return groups;
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function sortByDate(records) {
    return [...records].sort((a, b) => dateValue(a.date) - dateValue(b.date));
  }

  function sortByDateDesc(records) {
    return [...records].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }

  function dateValue(date) {
    return new Date(`${date}T00:00:00Z`).getTime();
  }

  function paddedDomain(min, max) {
    if (min === max) {
      const pad = Math.abs(min || 1) * 0.2;
      return { min: min - pad, max: max + pad };
    }
    const span = max - min;
    return { min: Math.max(0, min - span * 0.08), max: max + span * 0.12 };
  }

  function tickValues(min, max, count) {
    if (count <= 1) return [min];
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, index) => min + step * index);
  }

  function pickDateTicks(dates) {
    if (dates.length <= 4) return dates;
    const indexes = [0, Math.floor((dates.length - 1) / 3), Math.floor(((dates.length - 1) * 2) / 3), dates.length - 1];
    return unique(indexes.map((index) => dates[index]));
  }

  function percentChange(previous, latest) {
    if (!previous) return null;
    return ((latest - previous) / previous) * 100;
  }

  function changeClass(change, metric) {
    if (change === null || Math.abs(change) < 0.01) return "neutral";
    const improved = metric.lowerIsBetter ? change < 0 : change > 0;
    return improved ? "good" : "bad";
  }

  function formatSigned(value) {
    const rounded = Math.abs(value) < 10 ? value.toFixed(1) : value.toFixed(0);
    return value > 0 ? `+${rounded}` : rounded;
  }

  function formatValue(value, metric) {
    if (metric.unit === "count") return Math.round(value).toLocaleString("en-US");
    if (Math.abs(value) >= 100) return `${value.toFixed(0)} ${metric.unit}`;
    if (Math.abs(value) >= 10) return `${value.toFixed(1)} ${metric.unit}`;
    return `${value.toFixed(2)} ${metric.unit}`;
  }

  function formatAxisValue(value, metric) {
    if (metric.unit === "count") return Math.round(value).toLocaleString("en-US");
    if (Math.abs(value) >= 100) return value.toFixed(0);
    if (Math.abs(value) >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }

  function shortDate(date) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(`${date}T00:00:00Z`)
    );
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function readBenchmarkFromHash() {
    if (!window.location.hash) return null;
    return decodeURIComponent(window.location.hash.slice(1));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
