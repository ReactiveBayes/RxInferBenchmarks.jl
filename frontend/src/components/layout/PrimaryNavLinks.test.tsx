import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrimaryNavLinks } from "./PrimaryNavLinks";

describe("PrimaryNavLinks", () => {
  it("links to both documentation pages", () => {
    render(<PrimaryNavLinks />);
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/how-it-works\/?$/),
    );
    expect(screen.getByRole("link", { name: /adding a model/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/docs\/adding-a-model\/?$/),
    );
  });

  it("calls onNavigate when a link is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<PrimaryNavLinks onNavigate={onNavigate} />);
    await user.click(screen.getByRole("link", { name: /how it works/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
