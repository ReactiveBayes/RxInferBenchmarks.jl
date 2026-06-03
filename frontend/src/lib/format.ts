// Unit-aware value formatting shared by every chart and table.

function trim(value: number, digits = 3): string {
  return Number(value.toPrecision(digits)).toString();
}

export function formatValue(value: number, unit: string): string {
  if (unit === "ms") {
    if (value < 1) return `${trim(value * 1000)} µs`;
    if (value >= 1000) return `${trim(value / 1000)} s`;
    return `${trim(value)} ms`;
  }
  if (unit === "bytes") {
    if (value >= 1024 ** 3) return `${trim(value / 1024 ** 3)} GB`;
    if (value >= 1024 ** 2) return `${trim(value / 1024 ** 2)} MB`;
    if (value >= 1024) return `${trim(value / 1024)} KB`;
    return `${trim(value)} B`;
  }
  if (unit === "count") {
    if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
    if (value >= 1_000) return `${trim(value / 1_000)}k`;
    return trim(value);
  }
  return `${trim(value)} ${unit}`;
}

export function shortCommit(commit: string): string {
  return commit.slice(0, 7);
}

export function formatDate(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
