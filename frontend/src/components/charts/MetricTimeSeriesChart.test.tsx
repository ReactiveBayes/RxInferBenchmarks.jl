import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { MetricTimeSeriesChart } from "./MetricTimeSeriesChart";

function point(samples: number[], firstSeen: string): SeriesPoint {
  return {
    fingerprint: `fp-${firstSeen}`,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "gha",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: ["a1b2c3d"],
    samples,
    stats: sampleStats(samples),
  };
}

const metric = { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true };

describe("MetricTimeSeriesChart", () => {
  it("renders an accessible figure with environment and sample counts", () => {
    render(
      <MetricTimeSeriesChart
        points={[point([1, 2, 3], "2026-06-01T00:00:00Z"), point([4, 5, 6], "2026-06-08T00:00:00Z")]}
        metric={metric}
      />,
    );
    expect(screen.getByRole("figure", { name: /cold run over time/i })).toBeInTheDocument();
    expect(screen.getByText(/2 environments · 6 samples/i)).toBeInTheDocument();
    expect(screen.getByText(/min–max/)).toBeInTheDocument(); // variance is always displayed
  });

  it("renders an empty state when there are no points", () => {
    render(<MetricTimeSeriesChart points={[]} metric={metric} />);
    expect(screen.getByText(/no data yet for cold run/i)).toBeInTheDocument();
  });
});
