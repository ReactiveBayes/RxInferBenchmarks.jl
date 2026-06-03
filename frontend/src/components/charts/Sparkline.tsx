"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { normalizeValues } from "@/lib/transform/align";

/** Tiny normalized trend line for the overview grid (no axes, no chrome). */
export function Sparkline({
  values,
  color = "var(--chart-1)",
  height = 36,
  label,
}: {
  values: number[];
  color?: string;
  height?: number;
  label: string;
}) {
  if (values.length < 2) {
    return (
      <span role="img" aria-label={label} className="text-xs text-muted-foreground">
        not enough data
      </span>
    );
  }
  const rows = normalizeValues(values).map((value, index) => ({ index, value }));
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
          <Line
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
