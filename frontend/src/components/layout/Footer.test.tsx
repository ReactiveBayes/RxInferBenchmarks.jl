import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("credits the ReactiveBayes team with a GitHub link", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /reactivebayes team/i })).toHaveAttribute(
      "href",
      "https://github.com/ReactiveBayes",
    );
  });

  it("mentions it was made with Claude", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /claude/i })).toBeInTheDocument();
  });
});
