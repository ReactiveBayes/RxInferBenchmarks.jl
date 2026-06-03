import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { sampleStats } from "@/lib/transform/stats";
import type { SeriesPoint } from "@/lib/transform/series";
import { RecentEntriesTable } from "./RecentEntriesTable";

const metric = { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true };

function point(mean: number, firstSeen: string, fingerprint: string): SeriesPoint {
  const samples = [mean, mean, mean];
  return {
    fingerprint,
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

describe("RecentEntriesTable", () => {
  it("lists entries newest-first with Δ% against the prior entry", () => {
    render(
      <RecentEntriesTable
        points={[
          point(100, "2026-06-01T00:00:00Z", "fp1aaaaaaaaaaaa"),
          point(150, "2026-06-08T00:00:00Z", "fp2bbbbbbbbbbbb"),
        ]}
        metric={metric}
      />,
    );
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("2026-06-08");
    expect(rows[0]).toHaveTextContent("+50.0%");
    expect(rows[1]).toHaveTextContent("—"); // oldest has nothing to compare against
  });

  it("limits the number of rows", () => {
    const points = Array.from({ length: 15 }, (_, i) =>
      point(100 + i, `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`, `fp${i}`),
    );
    render(<RecentEntriesTable points={points} metric={metric} maxRows={5} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6); // header + 5
  });

  it("shows an empty state", () => {
    render(<RecentEntriesTable points={[]} metric={metric} />);
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();
  });
});
