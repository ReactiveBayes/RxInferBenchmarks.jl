import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { CompareChart } from "./CompareChart";

const metric = { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true };

function point(mean: number, firstSeen: string): SeriesPoint {
  return {
    fingerprint: `fp-${firstSeen}-${mean}`,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "x",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: [],
    samples: [mean],
    stats: sampleStats([mean]),
  };
}

describe("CompareChart", () => {
  it("renders one figure with all series labels accounted for", () => {
    render(
      <CompareChart
        seriesByLabel={{
          "GitHub Actions": [point(1, "2026-06-01"), point(2, "2026-06-08")],
          "Raspberry Pi": [point(9, "2026-06-20")],
        }}
        metric={metric}
      />,
    );
    expect(screen.getByRole("figure", { name: /cold run comparison/i })).toBeInTheDocument();
    expect(screen.getByText(/2 series/i)).toBeInTheDocument();
  });

  it("renders an empty state with no series", () => {
    render(<CompareChart seriesByLabel={{}} metric={metric} />);
    expect(screen.getByText(/nothing to compare/i)).toBeInTheDocument();
  });
});
