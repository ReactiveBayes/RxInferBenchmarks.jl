import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  fixtureExperiments,
  fixtureIndex,
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
      hardwareList={fixtureIndex.hardware}
      juliaVersions={["1.10", "1.12"]}
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
    await user.click(screen.getByRole("tab", { name: "Compare" }));
    expect(screen.getByText(/across hardware/i)).toBeInTheDocument();
    expect(screen.getByText(/across julia versions/i)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /entries/i }));
    expect(screen.getByRole("table", { name: /recent cold run entries/i })).toBeInTheDocument();
  });

  it("renders the dependency panel under the Environment tab", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("tab", { name: /environment/i }));
    expect(screen.getByText(/what changed\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dependency changes/i)).toBeInTheDocument();
  });

  it("uses a readable shadcn scenario picker with humanized labels", () => {
    renderView();
    expect(screen.getByRole("combobox", { name: /scenario/i })).toHaveTextContent(
      "iterations = 10, n = 1000",
    );
  });

  it("shows an empty state when there is no data for the selection", () => {
    renderView({ files: [] });
    expect(screen.getByText(/no benchmark data for this selection/i)).toBeInTheDocument();
  });

  it("offers a 2/3/4 chart-column toggle defaulting to 3", async () => {
    const user = userEvent.setup();
    renderView();
    const group = screen.getByRole("group", { name: /chart columns/i });
    const three = within(group).getByRole("button", { name: "3" });
    expect(three).toHaveAttribute("aria-pressed", "true");
    await user.click(within(group).getByRole("button", { name: "4" }));
    expect(within(group).getByRole("button", { name: "4" })).toHaveAttribute("aria-pressed", "true");
    expect(three).toHaveAttribute("aria-pressed", "false");
  });

  it("has hardware and Julia selectors inside the explore tab", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderView();
    expect(screen.getByRole("combobox", { name: /hardware/i })).toHaveTextContent(
      "GitHub Actions (ubuntu-latest)",
    );
    await user.click(screen.getByRole("combobox", { name: /julia version/i }));
    await user.click(screen.getByRole("option", { name: "Julia 1.10" }));
    expect(onSelect).toHaveBeenCalledWith({ julia: "1.10" });
  });

  it("time phases card can switch to a hardware & Julia comparison", async () => {
    const user = userEvent.setup();
    renderView();
    expect(screen.getByRole("figure", { name: /phase breakdown per environment/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /hardware & julia/i }));
    expect(screen.getByRole("figure", { name: /hardware and julia comparison/i })).toBeInTheDocument();
    // both gha and pi combos appear (built from allFiles, ignoring the current filter)
    expect(screen.getByRole("button", { name: /raspberry-pi-5 · julia 1\.12/i })).toBeInTheDocument();
  });

  it("offers a Compare scenarios tab when the benchmark has several scenarios", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("tab", { name: /compare scenarios/i }));
    expect(screen.getByText(/time phases across scenarios/i)).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: /scenario comparison/i })).toBeInTheDocument();
  });
});
