import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/docs/how-it-works/data/",
}));

import { DocsSideNav } from "./DocsSideNav";

const items = [
  { href: "/docs/how-it-works/", title: "Overview" },
  { href: "/docs/how-it-works/data/", title: "Data" },
];

describe("DocsSideNav", () => {
  it("renders the reference legend with all items", () => {
    render(<DocsSideNav items={items} />);
    const nav = screen.getByRole("navigation", { name: /benchmark reference/i });
    expect(nav).toHaveTextContent("Overview");
    expect(nav).toHaveTextContent("Data");
  });

  it("highlights the active document", () => {
    render(<DocsSideNav items={items} />);
    expect(screen.getByRole("link", { name: "Data" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
});
