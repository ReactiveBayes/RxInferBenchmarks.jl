import { describe, expect, it } from "vitest";
import { sampleStats } from "./stats";
import type { SeriesPoint } from "./series";
import { buildBandRows, buildDistributionRows, buildPhaseRows } from "./chartData";

function point(samples: number[], firstSeen: string, fingerprint = `fp-${firstSeen}`): SeriesPoint {
  return {
    fingerprint,
    firstSeen,
    lastSeen: firstSeen,
    hardwareId: "gha",
    juliaVersion: "1.12.6",
    juliaMinor: "1.12",
    rxinferVersion: "4.6.0",
    commits: ["a1b2c3d"],
    samples,
    stats: sampleStats(samples),
  };
}

describe("buildBandRows", () => {
  it("produces mean + min/max band rows sorted by date", () => {
    const rows = buildBandRows([
      point([10, 12, 14], "2026-06-08"),
      point([1, 2, 3], "2026-06-01"),
    ]);
    expect(rows.map((r) => r.date)).toEqual(["2026-06-01", "2026-06-08"]);
    expect(rows[0].mean).toBe(2);
    expect(rows[0].band).toEqual([1, 3]);
    expect(rows[1].point.fingerprint).toBe("fp-2026-06-08");
  });
});

describe("buildPhaseRows", () => {
  it("merges several metric series by fingerprint", () => {
    const rows = buildPhaseRows({
      model_creation_ms: [point([1, 1, 1], "2026-06-01", "fp1"), point([2, 2, 2], "2026-06-08", "fp2")],
      cold_run_ms: [point([10, 10, 10], "2026-06-01", "fp1")],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: "2026-06-01", model_creation_ms: 1, cold_run_ms: 10 });
    expect(rows[1].cold_run_ms).toBeUndefined(); // metric absent for fp2 — gap, not zero
  });
});

describe("buildScenarioPhaseRows", () => {
  it("produces one row per scenario with the latest mean per metric", async () => {
    const { makeResultFile, makeNewerResultFile } = await import("@/test/fixtures");
    const { buildScenarioPhaseRows } = await import("./chartData");
    const rows = buildScenarioPhaseRows([makeResultFile(), makeNewerResultFile()], {
      experimentId: "basic/coin_toss",
      metrics: ["cold_run_ms", "warm_run_min_ms"],
    });
    expect(rows).toHaveLength(2); // n=1000 and n=10000 scenarios
    const small = rows.find((r) => r.scenario.includes("n=1000_"));
    // newest fingerprint (aaaa00000002) wins for the n=1000 scenario
    expect(small?.cold_run_ms).toBeCloseTo(205);
    expect(small?.warm_run_min_ms).toBeCloseTo(2);
    // n=10000 only exists in the older file — falls back to its latest available
    const large = rows.find((r) => r.scenario.includes("n=10000"));
    expect(large?.cold_run_ms).toBeCloseTo(380);
  });

  it("filters by hardware", async () => {
    const { makeResultFile, makePiResultFile } = await import("@/test/fixtures");
    const { buildScenarioPhaseRows } = await import("./chartData");
    const rows = buildScenarioPhaseRows([makeResultFile(), makePiResultFile()], {
      experimentId: "basic/coin_toss",
      metrics: ["cold_run_ms"],
      hardwareId: "raspberry-pi-5",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cold_run_ms).toBeCloseTo(900);
  });
});

describe("buildDistributionRows", () => {
  it("flattens every sample with its date label", () => {
    const rows = buildDistributionRows([point([1, 2], "2026-06-01"), point([3], "2026-06-08")]);
    expect(rows).toEqual([
      { date: "2026-06-01", value: 1, fingerprint: "fp-2026-06-01" },
      { date: "2026-06-01", value: 2, fingerprint: "fp-2026-06-01" },
      { date: "2026-06-08", value: 3, fingerprint: "fp-2026-06-08" },
    ]);
  });
});
