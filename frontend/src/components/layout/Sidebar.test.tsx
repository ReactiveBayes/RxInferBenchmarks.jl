import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtureExperiments } from "@/test/fixtures";
import { Sidebar } from "./Sidebar";

const experiments = fixtureExperiments.experiments;

describe("Sidebar", () => {
  it("renders experiments grouped by category", () => {
    render(<Sidebar experiments={experiments} selected={null} onSelect={() => {}} />);
    expect(screen.getByText("Basic Examples")).toBeInTheDocument();
    expect(screen.getByText("Advanced Examples")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coin Toss Model" })).toBeInTheDocument();
  });

  it("marks the selected benchmark", () => {
    render(<Sidebar experiments={experiments} selected="basic/coin_toss" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Coin Toss Model" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("emits the experiment id on click and null for Overview", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Sidebar experiments={experiments} selected={null} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Kalman Filtering and Smoothing" }));
    expect(onSelect).toHaveBeenCalledWith("basic/kalman");
    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("filters by search over title and tags", async () => {
    const user = userEvent.setup();
    render(<Sidebar experiments={experiments} selected={null} onSelect={() => {}} />);
    await user.type(screen.getByRole("searchbox", { name: /search benchmarks/i }), "time series");
    expect(screen.getByRole("button", { name: "Bayesian Structural Time Series" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Coin Toss Model" })).not.toBeInTheDocument();
  });

  it("shows an empty state for no matches", async () => {
    const user = userEvent.setup();
    render(<Sidebar experiments={experiments} selected={null} onSelect={() => {}} />);
    await user.type(screen.getByRole("searchbox", { name: /search benchmarks/i }), "zzz");
    expect(screen.getByText(/no benchmarks match/i)).toBeInTheDocument();
  });
});
