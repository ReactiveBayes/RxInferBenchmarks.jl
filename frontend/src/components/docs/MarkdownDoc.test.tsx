import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownDoc } from "./MarkdownDoc";

const sample = `# Title

> **Living document.** Banner here.

Some text with a [doc link](architecture.md) and an
[external link](https://docs.rxinfer.com).

| Col | Val |
| --- | --- |
| a   | 1   |

\`\`\`julia
run_benchmark(scenario)
\`\`\`
`;

describe("MarkdownDoc", () => {
  it("renders headings, blockquotes, tables, and code blocks", () => {
    render(<MarkdownDoc markdown={sample} />);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByText(/banner here/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("run_benchmark(scenario)")).toBeInTheDocument();
  });

  it("rewrites repo-relative markdown links to reference routes", () => {
    render(<MarkdownDoc markdown={sample} />);
    expect(screen.getByRole("link", { name: "doc link" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/how-it-works\/architecture\/?$/),
    );
  });

  it("keeps external links external", () => {
    render(<MarkdownDoc markdown={sample} />);
    expect(screen.getByRole("link", { name: "external link" })).toHaveAttribute(
      "href",
      "https://docs.rxinfer.com",
    );
    expect(screen.getByRole("link", { name: "external link" })).toHaveAttribute("target", "_blank");
  });
});
