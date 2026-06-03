import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  fixtureExperiments,
  fixtureIndex,
  fixtureMetrics,
  makeNewerResultFile,
  makeResultFile,
} from "@/test/fixtures";
import { GlobalOverview } from "./GlobalOverview";

const files = [makeResultFile(), makeNewerResultFile()];

function renderOverview(onOpenBenchmark = vi.fn()) {
  render(
    <GlobalOverview
      experiments={fixtureExperiments.experiments}
      files={files}
      metricDefs={fixtureMetrics.metrics}
      index={fixtureIndex}
      onOpenBenchmark={onOpenBenchmark}
    />,
  );
  return onOpenBenchmark;
}

describe("GlobalOverview", () => {
  it("renders a sparkline card per benchmark with data", () => {
    renderOverview();
    expect(screen.getByRole("button", { name: /open coin toss model details/i })).toBeInTheDocument();
    // kalman/bsts have no data in the fixtures -> no cards
    expect(screen.queryByText("Kalman Filtering and Smoothing")).not.toBeInTheDocument();
  });

  it("surfaces top movers when the latest change crossed the threshold", () => {
    renderOverview();
    // warm_run_min_ms went 1.5 -> 2.0 = ~+33% regression
    expect(screen.getByText(/top movers/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/\(regression\)/i).length).toBeGreaterThanOrEqual(1);
  });

  it("opens a benchmark on card click", async () => {
    const user = userEvent.setup();
    const onOpen = renderOverview();
    await user.click(screen.getByRole("button", { name: /open coin toss model details/i }));
    expect(onOpen).toHaveBeenCalledWith("basic/coin_toss");
  });

  it("shows hardware coverage with Julia versions and last run", () => {
    renderOverview();
    const coverage = screen.getByLabelText(/hardware coverage/i);
    expect(coverage).toHaveTextContent("GitHub Actions (ubuntu-latest)");
    expect(coverage).toHaveTextContent("Raspberry Pi 5");
    expect(coverage).toHaveTextContent("Julia 1.10");
    expect(coverage).toHaveTextContent(/last run 2026-06-20/);
  });

  it("renders an empty state without data", () => {
    render(
      <GlobalOverview
        experiments={fixtureExperiments.experiments}
        files={[]}
        metricDefs={fixtureMetrics.metrics}
        index={undefined}
        onOpenBenchmark={vi.fn()}
      />,
    );
    expect(screen.getByText(/no benchmark data loaded yet/i)).toBeInTheDocument();
  });
});
