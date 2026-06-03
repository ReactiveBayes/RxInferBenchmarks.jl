import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderChart() {
  return render(
    <PhaseBreakdownChart
      seriesByMetric={{
        model_creation_ms: [point([1], "2026-06-01"), point([2], "2026-06-08")],
        cold_run_ms: [point([100], "2026-06-01")],
      }}
      metricDefs={metricDefs}
    />,
  );
}

describe("PhaseBreakdownChart", () => {
  it("renders a figure covering the provided environments", () => {
    renderChart();
    expect(screen.getByRole("figure", { name: /phase breakdown/i })).toBeInTheDocument();
    expect(screen.getByText(/2 environments/i)).toBeInTheDocument();
  });

  it("defaults to grouped log scale with every phase enabled", () => {
    renderChart();
    expect(screen.getByRole("button", { name: /log scale/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/2\/2 phases shown/i)).toBeInTheDocument();
    expect(screen.getByText(/grouped, log scale/i)).toBeInTheDocument();
  });

  it("documents the non-obvious interactions under the chart", () => {
    renderChart();
    expect(screen.getByText(/help:/i)).toHaveTextContent(/shift/i);
    expect(screen.getByText(/help:/i)).toHaveTextContent(/isolate/i);
  });

  it("shift-click isolates a phase, shift-click again restores all", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("button", { name: "Model creation" }));
    await user.keyboard("{/Shift}");
    expect(screen.getByText(/1\/2 phases shown/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cold run" })).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("button", { name: "Model creation" }));
    await user.keyboard("{/Shift}");
    expect(screen.getByText(/2\/2 phases shown/i)).toBeInTheDocument();
  });

  it("toggles individual phases off and on", async () => {
    const user = userEvent.setup();
    renderChart();
    const coldToggle = screen.getByRole("button", { name: "Cold run" });
    await user.click(coldToggle);
    expect(coldToggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/1\/2 phases shown/i)).toBeInTheDocument();
    await user.click(coldToggle);
    expect(screen.getByText(/2\/2 phases shown/i)).toBeInTheDocument();
  });

  it("switches between log and linear scale", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: /log scale/i }));
    expect(screen.getByRole("button", { name: /linear scale/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText(/grouped, linear scale/i)).toBeInTheDocument();
  });

  it("offers a stacked toggle (stacked forces linear)", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: /grouped/i }));
    expect(screen.getByText(/stacked, linear scale/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /linear scale/i })).toBeDisabled();
  });

  it("renders an empty state without data", () => {
    render(<PhaseBreakdownChart seriesByMetric={{}} metricDefs={metricDefs} />);
    expect(screen.getByText(/no phase data/i)).toBeInTheDocument();
  });
});
