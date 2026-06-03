import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("links to the RxInfer docs and repository", () => {
    render(
      <ThemeProvider attribute="class">
        <TopBar />
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: /rxinfer documentation/i })).toHaveAttribute(
      "href",
      "https://docs.rxinfer.com",
    );
    expect(screen.getByRole("link", { name: /rxinfer on github/i })).toHaveAttribute(
      "href",
      "https://github.com/ReactiveBayes/RxInfer.jl",
    );
  });

  it("links to both documentation pages", () => {
    render(
      <ThemeProvider attribute="class">
        <TopBar />
      </ThemeProvider>,
    );
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/how-it-works\/?$/),
    );
    expect(screen.getByRole("link", { name: /adding a model/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/adding-a-model\/?$/),
    );
  });

  it("renders extra controls passed as children", () => {
    render(
      <ThemeProvider attribute="class">
        <TopBar>
          <span>extra-control</span>
        </TopBar>
      </ThemeProvider>,
    );
    expect(screen.getByText("extra-control")).toBeInTheDocument();
  });
});
