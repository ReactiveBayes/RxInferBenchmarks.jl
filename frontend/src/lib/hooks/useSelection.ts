"use client";

// All dashboard state lives in query params (design/frontend.md): the
// benchmark universe is runtime-fetched, so static-export dynamic routes are
// impossible — and query params make every view a shareable link.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface Selection {
  /** Selected experiment id, e.g. "basic/kalman"; null = landing page. */
  benchmark: string | null;
  /** Metric id or "all" (overview). */
  metric: string;
  /** Scenario id or "all". */
  scenario: string;
  /** Hardware id; null = first available. */
  hardware: string | null;
  /** Julia minor version; null = first available. */
  julia: string | null;
  /** Comparison view enabled. */
  compare: boolean;
}

export interface SelectionUpdate {
  benchmark?: string | null;
  metric?: string | null;
  scenario?: string | null;
  hardware?: string | null;
  julia?: string | null;
  compare?: boolean | null;
}

const PARAM_KEYS = {
  benchmark: "b",
  metric: "m",
  scenario: "s",
  hardware: "hw",
  julia: "jl",
  compare: "cmp",
} as const;

export function useSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selection: Selection = {
    benchmark: searchParams.get(PARAM_KEYS.benchmark),
    metric: searchParams.get(PARAM_KEYS.metric) ?? "all",
    scenario: searchParams.get(PARAM_KEYS.scenario) ?? "all",
    hardware: searchParams.get(PARAM_KEYS.hardware),
    julia: searchParams.get(PARAM_KEYS.julia),
    compare: searchParams.get(PARAM_KEYS.compare) === "1",
  };

  const select = useCallback(
    (update: SelectionUpdate) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string | null | undefined, defaultValue?: string) => {
        if (value === undefined) return;
        if (value === null || value === defaultValue) params.delete(key);
        else params.set(key, value);
      };
      setOrDelete(PARAM_KEYS.benchmark, update.benchmark);
      setOrDelete(PARAM_KEYS.metric, update.metric, "all");
      setOrDelete(PARAM_KEYS.scenario, update.scenario, "all");
      setOrDelete(PARAM_KEYS.hardware, update.hardware);
      setOrDelete(PARAM_KEYS.julia, update.julia);
      if (update.compare !== undefined) {
        if (update.compare) params.set(PARAM_KEYS.compare, "1");
        else params.delete(PARAM_KEYS.compare);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { ...selection, select };
}
