import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, mockFetchByUrl } from "@/test/utils";
import {
  fixtureExperiments,
  fixtureHardware,
  fixtureIndex,
  fixtureMetrics,
  makeNewerResultFile,
  makePiResultFile,
  makeResultFile,
} from "@/test/fixtures";

const replaceMock = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
  useSearchParams: () => currentParams,
}));

import { DashboardPage } from "./DashboardPage";

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      mockFetchByUrl({
        "results/index.json": fixtureIndex,
        "experiments.json": fixtureExperiments,
        "metrics.json": fixtureMetrics,
        "hardware.json": fixtureHardware,
        "aaaa00000001.json": makeResultFile(),
        "aaaa00000002.json": makeNewerResultFile(),
        "bbbb00000001.json": makeResultFile({ fingerprint: "bbbb00000001" }),
        "cccc00000001.json": makePiResultFile(),
      }),
    ),
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    currentParams = new URLSearchParams();
    stubFetch();
  });

  it("shows the landing explainer and overview when nothing is selected", async () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByLabelText(/loading benchmarks/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/RxInfer\.jl/),
    );
    expect(await screen.findByLabelText(/global overview/i)).toBeInTheDocument();
  });

  it("shows the benchmark view when a benchmark is selected", async () => {
    currentParams = new URLSearchParams("b=basic%2Fcoin_toss");
    renderWithProviders(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Coin Toss Model" })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Cold run summary")).toBeInTheDocument();
  });

  it("offers hardware and Julia switchers inside the benchmark explore tab", async () => {
    currentParams = new URLSearchParams("b=basic%2Fcoin_toss");
    renderWithProviders(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /hardware/i })).toHaveTextContent(
        "GitHub Actions (ubuntu-latest)",
      ),
    );
    expect(screen.getByRole("combobox", { name: /julia version/i })).toHaveTextContent("Julia 1.12");
  });

  it("renders an error card when the index cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(mockFetchByUrl({})));
    renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(screen.getByText(/could not load benchmark data/i)).toBeInTheDocument());
  });
});
