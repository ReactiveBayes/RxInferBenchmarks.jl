import { describe, expect, it } from "vitest";
import { DESIGN_DOCS, findDesignDoc, readDesignDoc, resolveDocLink } from "./designDocs";

describe("design docs registry", () => {
  it("lists the living design documents in sidebar order", () => {
    expect(DESIGN_DOCS.map((d) => d.slug)).toEqual([
      "idea",
      "architecture",
      "benchmarks",
      "data",
      "frontend",
      "testing",
    ]);
  });

  it("reads every registered document from the repository", () => {
    for (const doc of DESIGN_DOCS) {
      const content = readDesignDoc(doc);
      expect(content.length).toBeGreaterThan(100);
    }
    expect(readDesignDoc(findDesignDoc("idea")!)).toContain("# The Idea");
  });
});

describe("resolveDocLink", () => {
  it("maps repo-relative markdown links to reference routes", () => {
    expect(resolveDocLink("architecture.md")).toBe("/docs/how-it-works/architecture/");
    expect(resolveDocLink("design/data.md")).toBe("/docs/how-it-works/data/");
    expect(resolveDocLink("../IDEA.md")).toBe("/docs/how-it-works/idea/");
    expect(resolveDocLink("./testing.md")).toBe("/docs/how-it-works/testing/");
  });

  it("passes external links, anchors, and app routes through", () => {
    expect(resolveDocLink("https://docs.rxinfer.com")).toBe("https://docs.rxinfer.com");
    expect(resolveDocLink("#section")).toBe("#section");
    expect(resolveDocLink("/docs/adding-a-model/")).toBe("/docs/adding-a-model/");
  });

  it("maps the design folder README to the section index", () => {
    expect(resolveDocLink("README.md")).toBe("/docs/how-it-works/");
  });
});
