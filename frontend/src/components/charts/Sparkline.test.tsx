import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders an accessible image role with the given label", () => {
    render(<Sparkline values={[1, 2, 3]} label="Cold run trend" />);
    expect(screen.getByRole("img", { name: "Cold run trend" })).toBeInTheDocument();
  });

  it("falls back gracefully with fewer than two points", () => {
    render(<Sparkline values={[1]} label="Cold run trend" />);
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
  });
});
