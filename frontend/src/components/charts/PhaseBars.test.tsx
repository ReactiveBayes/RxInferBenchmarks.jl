import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhaseBars } from "./PhaseBars";

// Assert the props handed to Recharts primitives (design/testing.md): the
// YAxis stub publishes its `scale` and `domain` so we can verify the axis is
// anchored at 0 across modes. Other primitives are pass-through stubs.
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  // jsdom has zero layout size, so the real ResponsiveContainer renders nothing.
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  YAxis: ({ scale, domain }: { scale?: unknown; domain?: unknown }) => (
    <div data-testid="y-axis" data-scale={String(scale)} data-domain={JSON.stringify(domain)} />
  ),
}));

const metricDefs = [
  { id: "model_creation_ms", label: "Model creation", unit: "ms", lower_is_better: true },
  { id: "cold_run_ms", label: "Cold run", unit: "ms", lower_is_better: true },
];

const rows = [
  { env: "1.12", model_creation_ms: 1, cold_run_ms: 100 },
  { env: "1.11", model_creation_ms: 2, cold_run_ms: 120 },
];

function renderBars() {
  return render(
    <PhaseBars
      rows={rows}
      xKey="env"
      metricDefs={metricDefs}
      ariaLabel="phase bars"
      captionPrefix="2 environments"
      emptyText="no phase data"
    />,
  );
}

function axis() {
  return screen.getByTestId("y-axis");
}

describe("PhaseBars Y axis", () => {
  it("uses a pseudo-log (symlog) scale anchored at 0 by default", () => {
    renderBars();
    expect(axis()).toHaveAttribute("data-scale", "symlog");
    expect(JSON.parse(axis().getAttribute("data-domain")!)[0]).toBe(0);
  });

  it("starts at 0 on the linear scale", async () => {
    const user = userEvent.setup();
    renderBars();
    await user.click(screen.getByRole("button", { name: /log scale/i }));
    expect(axis()).toHaveAttribute("data-scale", "linear");
    expect(JSON.parse(axis().getAttribute("data-domain")!)[0]).toBe(0);
  });

  it("starts at 0 when stacked (forced linear)", async () => {
    const user = userEvent.setup();
    renderBars();
    await user.click(screen.getByRole("button", { name: /grouped/i }));
    expect(axis()).toHaveAttribute("data-scale", "linear");
    expect(JSON.parse(axis().getAttribute("data-domain")!)[0]).toBe(0);
  });
});
