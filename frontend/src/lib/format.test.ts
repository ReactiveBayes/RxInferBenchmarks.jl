import { describe, expect, it } from "vitest";
import { formatDate, formatPct, formatValue, scenarioLabel, shortCommit } from "./format";

describe("scenarioLabel", () => {
  it("formats params sorted, without the seed", () => {
    expect(scenarioLabel({ n: 1000, iterations: 10, seed: 42 })).toBe("iterations = 10, n = 1000");
    expect(scenarioLabel({ mode: "filtering", n: 1000, seed: 42 })).toBe("mode = filtering, n = 1000");
  });

  it("falls back for empty params", () => {
    expect(scenarioLabel({ seed: 42 })).toBe("default");
  });
});

describe("formatValue", () => {
  it("formats milliseconds with unit scaling", () => {
    expect(formatValue(0.123, "ms")).toBe("123 µs");
    expect(formatValue(12.3, "ms")).toBe("12.3 ms");
    expect(formatValue(1234, "ms")).toBe("1.23 s");
  });

  it("formats bytes with unit scaling", () => {
    expect(formatValue(512, "bytes")).toBe("512 B");
    expect(formatValue(2048, "bytes")).toBe("2 KB");
    expect(formatValue(3_500_000, "bytes")).toBe("3.34 MB");
    expect(formatValue(2_147_483_648, "bytes")).toBe("2 GB");
  });

  it("formats counts compactly", () => {
    expect(formatValue(312, "count")).toBe("312");
    expect(formatValue(31_090, "count")).toBe("31.1k");
    expect(formatValue(2_500_000, "count")).toBe("2.5M");
  });

  it("falls back to the raw unit", () => {
    expect(formatValue(5, "things")).toBe("5 things");
  });
});

describe("shortCommit", () => {
  it("truncates to 7 characters", () => {
    expect(shortCommit("a1b2c3d4e5f6")).toBe("a1b2c3d");
    expect(shortCommit("abc")).toBe("abc");
  });
});

describe("formatDate", () => {
  it("renders an ISO timestamp as a calendar date", () => {
    expect(formatDate("2026-06-01T03:12:00Z")).toBe("2026-06-01");
  });
});

describe("formatPct", () => {
  it("renders signed percentages", () => {
    expect(formatPct(12.34)).toBe("+12.3%");
    expect(formatPct(-5)).toBe("-5.0%");
    expect(formatPct(0)).toBe("0.0%");
  });
});
