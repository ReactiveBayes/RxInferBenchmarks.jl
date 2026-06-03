import { describe, expect, it } from "vitest";
import { fixtureExperiments } from "@/test/fixtures";
import { groupByCategory } from "./nav";

describe("groupByCategory", () => {
  it("groups experiments by category preserving input order", () => {
    const groups = groupByCategory(fixtureExperiments.experiments);
    expect(groups.map((g) => g.category)).toEqual(["Basic Examples", "Advanced Examples"]);
    expect(groups[0].experiments.map((e) => e.id)).toEqual(["basic/coin_toss", "basic/kalman"]);
    expect(groups[1].experiments.map((e) => e.id)).toEqual(["advanced/bsts"]);
  });

  it("handles empty input", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
