import { describe, expect, it } from "vitest";
import { diffDependencies } from "./deps";

describe("diffDependencies", () => {
  it("detects added, removed, and changed packages", () => {
    const diff = diffDependencies(
      { RxInfer: "4.6.0", ReactiveMP: "5.7.1", Distributions: "0.25.107" },
      { RxInfer: "4.7.0", ReactiveMP: "5.7.1", BayesBase: "1.5.0" },
    );
    expect(diff.changed).toEqual([{ name: "RxInfer", from: "4.6.0", to: "4.7.0" }]);
    expect(diff.added).toEqual([{ name: "BayesBase", version: "1.5.0" }]);
    expect(diff.removed).toEqual([{ name: "Distributions", version: "0.25.107" }]);
    expect(diff.unchangedCount).toBe(1);
    expect(diff.hasChanges).toBe(true);
  });

  it("reports no changes for identical manifests", () => {
    const deps = { RxInfer: "4.6.0" };
    const diff = diffDependencies(deps, deps);
    expect(diff.hasChanges).toBe(false);
    expect(diff.unchangedCount).toBe(1);
  });

  it("treats a missing previous manifest as everything added", () => {
    const diff = diffDependencies(undefined, { RxInfer: "4.6.0" });
    expect(diff.added).toEqual([{ name: "RxInfer", version: "4.6.0" }]);
    expect(diff.hasChanges).toBe(true);
  });
});
