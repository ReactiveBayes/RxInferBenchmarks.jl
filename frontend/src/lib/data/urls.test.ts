import { afterEach, describe, expect, it, vi } from "vitest";
import { dataBaseUrl, dataUrl } from "./urls";

describe("urls", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses NEXT_PUBLIC_DATA_BASE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_BASE_URL", "/local-data");
    expect(dataBaseUrl()).toBe("/local-data");
  });

  it("falls back to the production raw GitHub URL", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_BASE_URL", "");
    expect(dataBaseUrl()).toContain("raw.githubusercontent.com/ReactiveBayes/RxInferBenchmarks.jl/main/data");
  });

  it("joins paths without duplicate slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_BASE_URL", "/local-data/");
    expect(dataUrl("/results/index.json")).toBe("/local-data/results/index.json");
    expect(dataUrl("results/index.json")).toBe("/local-data/results/index.json");
  });
});
