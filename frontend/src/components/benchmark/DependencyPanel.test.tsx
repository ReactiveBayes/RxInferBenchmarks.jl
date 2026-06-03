import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DependencyPanel } from "./DependencyPanel";

const current = { RxInfer: "4.7.0", ReactiveMP: "5.7.1", BayesBase: "1.5.0" };
const previous = { RxInfer: "4.6.0", ReactiveMP: "5.7.1", Distributions: "0.25.107" };

describe("DependencyPanel", () => {
  it("summarizes the diff against the previous environment", () => {
    render(<DependencyPanel current={current} previous={previous} currentLabel="aaaa00000002" />);
    expect(screen.getByText(/1 changed, 1 added, 1 removed/i)).toBeInTheDocument();
    expect(screen.getByText("RxInfer")).toBeInTheDocument();
    expect(screen.getByText(/4\.6\.0 → 4\.7\.0/)).toBeInTheDocument();
  });

  it("notes when the environment is the first recorded", () => {
    render(<DependencyPanel current={current} currentLabel="aaaa00000001" />);
    expect(screen.getByText(/first recorded environment/i)).toBeInTheDocument();
  });

  it("reveals the full manifest on demand", async () => {
    const user = userEvent.setup();
    render(<DependencyPanel current={current} previous={current} currentLabel="x" />);
    expect(screen.queryByText("BayesBase")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show full manifest/i }));
    expect(screen.getByText("BayesBase")).toBeInTheDocument();
    expect(screen.getByText(/identical to previous/i)).toBeInTheDocument();
  });
});
