import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingExplainer } from "./LandingExplainer";

describe("LandingExplainer", () => {
  it("explains what RxInfer is", () => {
    render(<LandingExplainer />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/RxInfer\.jl/);
    expect(screen.getByText(/reactive\s+message passing/i)).toBeInTheDocument();
  });

  it("links to the official documentation and repository", () => {
    render(<LandingExplainer />);
    expect(screen.getByRole("link", { name: /rxinfer documentation/i })).toHaveAttribute(
      "href",
      "https://docs.rxinfer.com",
    );
    expect(screen.getByRole("link", { name: /rxinfer on github/i })).toHaveAttribute(
      "href",
      "https://github.com/ReactiveBayes/RxInfer.jl",
    );
  });

  it("links to the local docs pages", () => {
    render(<LandingExplainer />);
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/how-it-works\/?$/),
    );
    expect(screen.getByRole("link", { name: /add your own model/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/adding-a-model\/?$/),
    );
  });
});
