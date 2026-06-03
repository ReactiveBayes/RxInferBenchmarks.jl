import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { PhaseBreakdownChart } from "./PhaseBreakdownChart";

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

const metricDefs = [
  { id: "model_creation_ms", label: "Model creation", unit: "ms", lower_is_better: true },
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
  { id: "allocations", label: "Allocations", unit: "count", lower_is_better: true },
];

describe("PhaseBreakdownChart", () => {
  it("renders a figure covering the provided environments", () => {
    render(
      <PhaseBreakdownChart
        seriesByMetric={{
          model_creation_ms: [point([1], "2026-06-01"), point([2], "2026-06-08")],
          cold_run_ms: [point([100], "2026-06-01")],
        }}
        metricDefs={metricDefs}
      />,
    );
    expect(screen.getByRole("figure", { name: /phase breakdown/i })).toBeInTheDocument();
    expect(screen.getByText(/2 environments/i)).toBeInTheDocument();
  });

  it("renders an empty state without data", () => {
    render(<PhaseBreakdownChart seriesByMetric={{}} metricDefs={metricDefs} />);
    expect(screen.getByText(/no phase data/i)).toBeInTheDocument();
  });
});
