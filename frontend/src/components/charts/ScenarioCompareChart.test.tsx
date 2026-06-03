import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioCompareChart } from "./ScenarioCompareChart";

const metricDefs = [
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
  { id: "warm_run_min_ms", label: "Warm run (min)", unit: "ms", lower_is_better: true },
];

const rows = [
  {
    scenario: "mode=filtering__n=100__seed=42",
    label: "mode = filtering, n = 100",
    params: { mode: "filtering", n: 100, seed: 42 },
    cold_run_ms: 90,
    warm_run_min_ms: 1.1,
  },
  {
    scenario: "mode=filtering__n=1000__seed=42",
    label: "mode = filtering, n = 1000",
    params: { mode: "filtering", n: 1000, seed: 42 },
    cold_run_ms: 180,
    warm_run_min_ms: 1.5,
  },
  {
    scenario: "mode=smoothing__n=1000__seed=42",
    label: "mode = smoothing, n = 1000",
    params: { mode: "smoothing", n: 1000, seed: 42 },
    cold_run_ms: 380,
    warm_run_min_ms: 8,
  },
];

function renderChart() {
  return render(<ScenarioCompareChart rows={rows} metricDefs={metricDefs} />);
}

describe("ScenarioCompareChart", () => {
  it("renders the legend component above the chart, mapping letters to params", () => {
    renderChart();
    const legend = screen.getByRole("list", { name: /scenario legend/i });
    expect(legend).toHaveTextContent("Scenario A : mode = filtering, n = 100");
    expect(legend).toHaveTextContent("Scenario C : mode = smoothing, n = 1000");
    expect(screen.getByText(/3\/3 scenarios/i)).toBeInTheDocument();
  });

  it("toggles individual scenarios from the legend", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("button", { name: /scenario a/i }));
    expect(screen.getByText(/2\/3 scenarios/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /scenario a/i }));
    expect(screen.getByText(/3\/3 scenarios/i)).toBeInTheDocument();
  });

  it("shift-click isolates a scenario", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("button", { name: /scenario b/i }));
    await user.keyboard("{/Shift}");
    expect(screen.getByText(/1\/3 scenarios/i)).toBeInTheDocument();
  });

  it("groups scenarios by parameter keyword (e.g. only mode=smoothing)", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("combobox", { name: /filter by mode/i }));
    await user.click(screen.getByRole("option", { name: "smoothing" }));
    expect(screen.getByText(/1\/3 scenarios/i)).toBeInTheDocument();
    // filtered-out scenarios are disabled in the legend
    expect(screen.getByRole("button", { name: /scenario a/i })).toBeDisabled();
  });

  it("offers numeric filters too (e.g. only n=1000)", async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole("combobox", { name: /filter by n/i }));
    await user.click(screen.getByRole("option", { name: "1000" }));
    expect(screen.getByText(/2\/3 scenarios/i)).toBeInTheDocument();
  });

  it("documents the legend interactions", () => {
    renderChart();
    const legend = screen.getByLabelText(/scenario legend and filters/i);
    expect(within(legend).getByText(/help:/i)).toHaveTextContent(/shift/i);
  });

  it("renders an empty state without rows", () => {
    render(<ScenarioCompareChart rows={[]} metricDefs={metricDefs} />);
    expect(screen.getByText(/no scenario data/i)).toBeInTheDocument();
  });
});
