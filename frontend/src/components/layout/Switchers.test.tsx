import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtureIndex } from "@/test/fixtures";
import { HardwareSwitcher, JuliaSwitcher } from "./Switchers";

describe("HardwareSwitcher", () => {
  it("shows the selected hardware label", () => {
    render(
      <HardwareSwitcher hardware={fixtureIndex.hardware} value="raspberry-pi-5" onChange={() => {}} />,
    );
    expect(screen.getByRole("combobox", { name: /hardware/i })).toHaveTextContent("Raspberry Pi 5");
  });

  it("lists all hardware and emits the chosen id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <HardwareSwitcher
        hardware={fixtureIndex.hardware}
        value="github-actions-ubuntu"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: /hardware/i }));
    await user.click(screen.getByRole("option", { name: "Raspberry Pi 5" }));
    expect(onChange).toHaveBeenCalledWith("raspberry-pi-5");
  });
});

describe("JuliaSwitcher", () => {
  it("lists versions and emits the chosen one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<JuliaSwitcher versions={["1.10", "1.12"]} value="1.12" onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: /julia version/i }));
    await user.click(screen.getByRole("option", { name: "Julia 1.10" }));
    expect(onChange).toHaveBeenCalledWith("1.10");
  });
});
