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

  it("resolves the local seed dataset paths in dev", () => {
    // dev points the base at the FAKE seed tree (data/seed via /local-data/seed)
    vi.stubEnv("NEXT_PUBLIC_DATA_BASE_URL", "/local-data/seed");
    expect(dataBaseUrl()).toBe("/local-data/seed");
    expect(dataUrl("results/index.json")).toBe("/local-data/seed/results/index.json");
    expect(dataUrl("hardware.json")).toBe("/local-data/seed/hardware.json");
  });

  it("joins paths without duplicate slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_BASE_URL", "/local-data/");
    expect(dataUrl("/results/index.json")).toBe("/local-data/results/index.json");
    expect(dataUrl("results/index.json")).toBe("/local-data/results/index.json");
  });
});
