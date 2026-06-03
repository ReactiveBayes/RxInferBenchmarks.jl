import { describe, expect, it } from "vitest";
import { metricColor, seriesColor } from "./chartTheme";

describe("metricColor", () => {
  it("is stable for a metric across calls", () => {
    expect(metricColor("cold_run_ms")).toBe(metricColor("cold_run_ms"));
  });

  it("returns a chart palette CSS variable", () => {
    expect(metricColor("anything")).toMatch(/^var\(--chart-[1-5]\)$/);
  });

  it("assigns the canonical metrics distinct colors", () => {
    const colors = new Set(
      ["ttfx_ms", "model_creation_ms", "cold_run_ms", "warm_run_min_ms", "allocations"].map(
        metricColor,
      ),
    );
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });
});

describe("seriesColor", () => {
  it("cycles the palette by index", () => {
    expect(seriesColor(0)).toBe("var(--chart-1)");
    expect(seriesColor(4)).toBe("var(--chart-5)");
    expect(seriesColor(5)).toBe("var(--chart-1)");
  });
});
