import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioCompareChart } from "./ScenarioCompareChart";

const metricDefs = [
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
  { id: "warm_run_min_ms", label: "Warm run (min)", unit: "ms", lower_is_better: true },
];

const rows = [
  { scenario: "iterations=10__n=1000__seed=42", cold_run_ms: 180, warm_run_min_ms: 1.5 },
  { scenario: "iterations=10__n=10000__seed=42", cold_run_ms: 380, warm_run_min_ms: 8 },
];

function renderChart() {
  return render(<ScenarioCompareChart rows={rows} metricDefs={metricDefs} />);
}

describe("ScenarioCompareChart", () => {
  it("renders a figure with one group per scenario, grouped + log by default", () => {
    renderChart();
    expect(screen.getByRole("figure", { name: /scenario comparison/i })).toBeInTheDocument();
    expect(screen.getByText(/2 scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/grouped, log scale/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /grouped/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles to stacked bars, which force a linear scale", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: /grouped/i }));
    expect(screen.getByText(/stacked, linear scale/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /linear scale/i })).toBeDisabled();
  });

  it("toggles individual phases", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: "Cold run" }));
    expect(screen.getByText(/1\/2 phases shown/i)).toBeInTheDocument();
  });

  it("toggles between log and linear when grouped", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: /log scale/i }));
    expect(screen.getByText(/grouped, linear scale/i)).toBeInTheDocument();
  });

  it("renders an empty state without rows", () => {
    render(<ScenarioCompareChart rows={[]} metricDefs={metricDefs} />);
    expect(screen.getByText(/no scenario data/i)).toBeInTheDocument();
  });
});
