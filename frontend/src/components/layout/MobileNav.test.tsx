import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "./MobileNav";

describe("MobileNav", () => {
  it("opens a drawer with the primary navigation links", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    // Closed by default — the links are not rendered yet.
    expect(screen.queryByRole("link", { name: /how it works/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));

    expect(await screen.findByRole("link", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /adding a model/i })).toBeInTheDocument();
  });

  it("renders page-specific children with a close callback", async () => {
    const user = userEvent.setup();
    render(
      <MobileNav>
        {(close) => (
          <button type="button" onClick={close}>
            pick something
          </button>
        )}
      </MobileNav>,
    );
    await user.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const item = await screen.findByRole("button", { name: "pick something" });
    expect(item).toBeInTheDocument();

    // Activating a page item closes the drawer.
    await user.click(item);
    expect(screen.queryByRole("button", { name: "pick something" })).not.toBeInTheDocument();
  });
});
