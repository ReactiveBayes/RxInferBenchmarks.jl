import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { SummaryStrip } from "./SummaryStrip";

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

const metricDefs = [
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
  { id: "allocations", label: "Allocations", unit: "count", lower_is_better: true },
  { id: "absent_metric", label: "Absent", unit: "ms", lower_is_better: true },
];

const seriesByMetric = {
  cold_run_ms: [point([100, 100, 100], "2026-06-01"), point([150, 150, 150], "2026-06-08")],
  allocations: [point([1000, 1000, 1000], "2026-06-01")],
};

describe("SummaryStrip", () => {
  it("renders one card per metric with data, with value ± std (n)", () => {
    render(<SummaryStrip seriesByMetric={seriesByMetric} metricDefs={metricDefs} />);
    expect(screen.getByLabelText("Cold run summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Allocations summary")).toBeInTheDocument();
    expect(screen.queryByLabelText("Absent summary")).not.toBeInTheDocument();
    expect(screen.getByText("150 ms")).toBeInTheDocument();
    expect(screen.getAllByText(/\(n=3\)/)).not.toHaveLength(0);
  });

  it("flags the 50% cold run regression", () => {
    render(<SummaryStrip seriesByMetric={seriesByMetric} metricDefs={metricDefs} />);
    expect(screen.getByLabelText(/\+50\.0% \(regression\)/i)).toBeInTheDocument();
  });

  it("invokes the metric selection callback", async () => {
    const user = userEvent.setup();
    const onSelectMetric = vi.fn();
    render(
      <SummaryStrip
        seriesByMetric={seriesByMetric}
        metricDefs={metricDefs}
        onSelectMetric={onSelectMetric}
      />,
    );
    await user.click(screen.getByLabelText("Cold run summary"));
    expect(onSelectMetric).toHaveBeenCalledWith("cold_run_ms");
  });

  it("shows an empty state without data", () => {
    render(<SummaryStrip seriesByMetric={{}} metricDefs={metricDefs} />);
    expect(screen.getByText(/no measurements yet/i)).toBeInTheDocument();
  });
});
