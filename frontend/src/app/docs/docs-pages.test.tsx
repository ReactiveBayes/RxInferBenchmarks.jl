import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorksPage from "./how-it-works/page";
import AddingAModelPage from "./adding-a-model/page";

describe("How it works page", () => {
  it("explains the full pipeline", () => {
    render(<HowItWorksPage />);
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByText(/3 separate Julia processes/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /environment fingerprints/i })).toBeInTheDocument();
    expect(screen.getByText(/if any test\s+fails, no\s+benchmarks are recorded/i)).toBeInTheDocument();
  });
});

describe("Adding a model page", () => {
  it("walks through all tutorial steps", () => {
    render(<AddingAModelPage />);
    expect(screen.getByRole("heading", { name: /adding a new model/i })).toBeInTheDocument();
    for (const step of [
      /prerequisites/i,
      /standalone julia project/i,
      /correctness test first/i,
      /uniform contract/i,
      /register the experiment/i,
      /open a pull request/i,
    ]) {
      expect(screen.getByRole("heading", { name: step })).toBeInTheDocument();
    }
    expect(screen.getByText(/run_benchmark\(scenario; callbacks\)/)).toBeInTheDocument();
  });
});
