import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegressionBadge } from "./RegressionBadge";

describe("RegressionBadge", () => {
  it("shows a red regression badge with signed percent", () => {
    render(<RegressionBadge result={{ direction: "regression", pctChange: 20 }} />);
    const badge = screen.getByLabelText(/\+20\.0% \(regression\)/i);
    expect(badge.className).toContain("signal-regress");
  });

  it("shows a green improvement badge", () => {
    render(<RegressionBadge result={{ direction: "improvement", pctChange: -12.5 }} />);
    const badge = screen.getByLabelText(/-12\.5% \(improvement\)/i);
    expect(badge.className).toContain("signal-improve");
  });

  it("shows a neutral badge for flat changes", () => {
    render(<RegressionBadge result={{ direction: "flat", pctChange: 0.5 }} />);
    expect(screen.getByLabelText(/\+0\.5% \(flat\)/i)).toBeInTheDocument();
  });

  it("shows a placeholder when there is nothing to compare", () => {
    render(<RegressionBadge result={{ direction: "none", pctChange: 0 }} />);
    expect(screen.getByLabelText(/no previous entry/i)).toBeInTheDocument();
  });
});
