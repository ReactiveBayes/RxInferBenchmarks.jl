import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvironmentCompareChart } from "./EnvironmentCompareChart";

const metricDefs = [
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
  { id: "warm_run_min_ms", label: "Warm run (min)", unit: "ms", lower_is_better: true },
];

const rows = [
  {
    label: "github-actions-ubuntu · Julia 1.12",
    hardwareId: "github-actions-ubuntu",
    juliaMinor: "1.12",
    cold_run_ms: 205,
    warm_run_min_ms: 2,
  },
  {
    label: "raspberry-pi-5 · Julia 1.12",
    hardwareId: "raspberry-pi-5",
    juliaMinor: "1.12",
    cold_run_ms: 900,
    warm_run_min_ms: 7.5,
  },
];

describe("EnvironmentCompareChart", () => {
  it("renders one bar group per hardware × Julia combo", () => {
    render(<EnvironmentCompareChart rows={rows} metricDefs={metricDefs} />);
    expect(screen.getByRole("figure", { name: /hardware and julia comparison/i })).toBeInTheDocument();
    expect(screen.getByText(/2\/2 hardware × julia combinations/i)).toBeInTheDocument();
  });

  it("toggles combos on and off", async () => {
    const user = userEvent.setup();
    render(<EnvironmentCompareChart rows={rows} metricDefs={metricDefs} />);
    const group = screen.getByRole("group", { name: /hardware and julia combinations/i });
    await user.click(screen.getByRole("button", { name: "raspberry-pi-5 · Julia 1.12" }));
    expect(screen.getByText(/1\/2 hardware × julia combinations/i)).toBeInTheDocument();
    expect(group).toBeInTheDocument();
  });

  it("inherits the stacked/grouped and scale toggles", async () => {
    const user = userEvent.setup();
    render(<EnvironmentCompareChart rows={rows} metricDefs={metricDefs} />);
    expect(screen.getByText(/grouped, log scale/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /grouped/i }));
    expect(screen.getByText(/stacked, linear scale/i)).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<EnvironmentCompareChart rows={[]} metricDefs={metricDefs} />);
    expect(screen.getByText(/no data across hardware/i)).toBeInTheDocument();
  });
});
