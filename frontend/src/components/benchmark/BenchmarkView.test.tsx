import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  fixtureExperiments,
  fixtureMetrics,
  makeNewerResultFile,
  makePiResultFile,
  makeResultFile,
} from "@/test/fixtures";
import { BenchmarkView } from "./BenchmarkView";

const experiment = fixtureExperiments.experiments[0]; // basic/coin_toss
const files = [makeResultFile(), makeNewerResultFile()];
const allFiles = [...files, makePiResultFile()];

function renderView(overrides: Partial<Parameters<typeof BenchmarkView>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <BenchmarkView
      experiment={experiment}
      files={files}
      allFiles={allFiles}
      metricDefs={fixtureMetrics.metrics}
      hardware="github-actions-ubuntu"
      julia="1.12"
      metric="all"
      scenario="all"
      onSelect={onSelect}
      {...overrides}
    />,
  );
  return { onSelect };
}

describe("BenchmarkView", () => {
  it("renders the header with category, title, and tags", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Coin Toss Model" })).toBeInTheDocument();
    expect(screen.getByText("Basic Examples")).toBeInTheDocument();
    expect(screen.getByText("conjugate")).toBeInTheDocument();
  });

  it("shows summary cards and small multiples in overview mode", () => {
    renderView();
    expect(screen.getByLabelText("Cold run summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Allocations summary")).toBeInTheDocument();
    // small multiples figures
    expect(screen.getAllByRole("figure").length).toBeGreaterThanOrEqual(3);
  });

  it("selecting a summary card requests the metric deep dive", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderView();
    await user.click(screen.getByLabelText("Cold run summary"));
    expect(onSelect).toHaveBeenCalledWith({ metric: "cold_run_ms" });
  });

  it("deep dive shows tabs incl. comparison across hardware and Julia versions", async () => {
    const user = userEvent.setup();
    renderView({ metric: "cold_run_ms" });
    expect(screen.getByRole("figure", { name: /cold run over time/i })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /compare/i }));
    expect(screen.getByText(/across hardware/i)).toBeInTheDocument();
    expect(screen.getByText(/across julia versions/i)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /entries/i }));
    expect(screen.getByRole("table", { name: /recent cold run entries/i })).toBeInTheDocument();
  });

  it("renders the dependency panel for the latest environment", () => {
    renderView();
    expect(screen.getByText(/what changed\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dependency changes/i)).toBeInTheDocument();
  });

  it("shows an empty state when there is no data for the selection", () => {
    renderView({ files: [] });
    expect(screen.getByText(/no benchmark data for this selection/i)).toBeInTheDocument();
  });
});
