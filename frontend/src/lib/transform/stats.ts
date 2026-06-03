export interface SampleStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  n: number;
}

/** Summary statistics over a pooled sample array (variance is always displayed — design/frontend.md). */
export function sampleStats(samples: number[]): SampleStats {
  if (samples.length === 0) throw new Error("sampleStats: empty sample array");
  const n = samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((acc, v) => acc + v, 0) / n;
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const std =
    n > 1
      ? Math.sqrt(samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1))
      : 0;
  return { mean, median, min: sorted[0], max: sorted[n - 1], std, n };
}
