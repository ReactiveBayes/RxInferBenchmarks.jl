import { describe, expect, it } from "vitest";
import { makeNewerResultFile, makePiResultFile, makeResultFile } from "@/test/fixtures";
import { buildSeries, listMetrics, listScenarios } from "./series";

const files = [makeNewerResultFile(), makeResultFile(), makePiResultFile()]; // intentionally unsorted

describe("buildSeries", () => {
  it("builds a chronologically sorted series for one (experiment, scenario, metric)", () => {
    const series = buildSeries(files, {
      experimentId: "basic/coin_toss",
      scenarioId: "iterations=10__n=1000__seed=42",
      metric: "cold_run_ms",
    });
    // pi file included: 3 points across 2 hardware
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.fingerprint)).toEqual([
      "aaaa00000001",
      "aaaa00000002",
      "cccc00000001",
    ]);
    const first = series[0];
    expect(first.stats.mean).toBeCloseTo(180);
    expect(first.stats.n).toBe(3);
    expect(first.hardwareId).toBe("github-actions-ubuntu");
    expect(first.juliaMinor).toBe("1.12");
    expect(first.rxinferVersion).toBe("4.6.0");
  });

  it("filters by hardware when requested", () => {
    const series = buildSeries(files, {
      experimentId: "basic/coin_toss",
      scenarioId: "iterations=10__n=1000__seed=42",
      metric: "cold_run_ms",
      hardwareId: "raspberry-pi-5",
    });
    expect(series).toHaveLength(1);
    expect(series[0].stats.mean).toBeCloseTo(900);
  });

  it("skips files lacking the scenario or metric and errored scenarios", () => {
    const broken = makeResultFile({ fingerprint: "dddd00000001" });
    broken.experiments[0].scenarios[0].status = "error";
    broken.experiments[0].scenarios[0].samples = {};
    const series = buildSeries([broken], {
      experimentId: "basic/coin_toss",
      scenarioId: "iterations=10__n=1000__seed=42",
      metric: "cold_run_ms",
    });
    expect(series).toHaveLength(0);
  });
});

describe("listScenarios", () => {
  it("collects unique scenario ids for an experiment", () => {
    const scenarios = listScenarios(files, "basic/coin_toss");
    expect(scenarios.map((s) => s.scenario_id)).toEqual([
      "iterations=10__n=1000__seed=42",
      "iterations=10__n=10000__seed=42",
    ]);
  });

  it("returns empty for unknown experiments", () => {
    expect(listScenarios(files, "nope/never")).toEqual([]);
  });
});

describe("listMetrics", () => {
  it("collects unique metric ids present for an experiment", () => {
    expect(listMetrics(files, "basic/coin_toss")).toEqual([
      "allocations",
      "cold_run_ms",
      "warm_run_min_ms",
    ]);
  });
});
