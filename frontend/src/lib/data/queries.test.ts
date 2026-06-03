import { describe, expect, it } from "vitest";
import { fixtureIndex } from "@/test/fixtures";
import { flattenIndexEntries } from "./queries";

describe("flattenIndexEntries", () => {
  it("flattens all hardware entries", () => {
    const entries = flattenIndexEntries(fixtureIndex);
    expect(entries).toHaveLength(4);
  });

  it("filters by hardware id", () => {
    const entries = flattenIndexEntries(fixtureIndex, { hardwareId: "raspberry-pi-5" });
    expect(entries).toHaveLength(1);
    expect(entries[0].fingerprint).toBe("cccc00000001");
  });

  it("returns empty for undefined index", () => {
    expect(flattenIndexEntries(undefined)).toEqual([]);
  });
});
