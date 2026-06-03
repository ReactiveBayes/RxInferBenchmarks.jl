import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const replaceMock = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
  useSearchParams: () => currentParams,
}));

import { useSelection } from "./useSelection";

describe("useSelection", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    currentParams = new URLSearchParams();
  });

  it("exposes defaults when no params are set", () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.benchmark).toBeNull();
    expect(result.current.metric).toBe("all");
    expect(result.current.scenario).toBe("all");
    expect(result.current.hardware).toBeNull();
    expect(result.current.julia).toBeNull();
  });

  it("reads selection from query params", () => {
    currentParams = new URLSearchParams(
      "b=basic%2Fkalman&m=cold_run_ms&s=mode%3Dfiltering&hw=raspberry-pi-5&jl=1.12",
    );
    const { result } = renderHook(() => useSelection());
    expect(result.current.benchmark).toBe("basic/kalman");
    expect(result.current.metric).toBe("cold_run_ms");
    expect(result.current.scenario).toBe("mode=filtering");
    expect(result.current.hardware).toBe("raspberry-pi-5");
    expect(result.current.julia).toBe("1.12");
  });

  it("select() writes params via router.replace and drops defaults", () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select({ benchmark: "basic/coin_toss", metric: "all" }));
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).toContain("b=basic%2Fcoin_toss");
    expect(url).not.toContain("m="); // "all" is the default -> omitted
  });

  it("select(null) clears a param", () => {
    currentParams = new URLSearchParams("b=basic%2Fkalman&m=cold_run_ms");
    const { result } = renderHook(() => useSelection());
    act(() => result.current.select({ benchmark: null }));
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).not.toContain("b=");
    expect(url).toContain("m=cold_run_ms"); // untouched params survive
  });
});
