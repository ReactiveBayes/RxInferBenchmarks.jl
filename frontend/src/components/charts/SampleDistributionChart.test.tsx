import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { SampleDistributionChart } from "./SampleDistributionChart";

const metric = { id: "warm_run_min_ms", label: "Warm run (min)", unit: "ms", lower_is_better: true };

function point(samples: number[], firstSeen: string): SeriesPoint {
  return {
    fingerprint: `fp-${firstSeen}`,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "gha",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: [],
    samples,
    stats: sampleStats(samples),
  };
}

describe("SampleDistributionChart", () => {
  it("reports the number of raw samples shown", () => {
    render(
      <SampleDistributionChart
        points={[point([1, 2, 3], "2026-06-01"), point([4, 5, 6], "2026-06-08")]}
        metric={metric}
      />,
    );
    expect(screen.getByRole("figure", { name: /sample distribution/i })).toBeInTheDocument();
    expect(screen.getByText(/6 individual samples/i)).toBeInTheDocument();
  });

  it("renders an empty state without samples", () => {
    render(<SampleDistributionChart points={[]} metric={metric} />);
    expect(screen.getByText(/no samples yet/i)).toBeInTheDocument();
  });
});
