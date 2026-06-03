import { formatDate, formatValue, shortCommit } from "@/lib/format";
import type { SeriesPoint } from "@/lib/transform/series";

/** Shared hover card: value ± std (n), environment versions, commits. */
export function PointTooltip({ point, unit }: { point: SeriesPoint; unit: string }) {
  const { stats } = point;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{formatDate(point.firstSeen)}</p>
      <p className="mt-1 font-mono text-sm">
        {formatValue(stats.mean, unit)}{" "}
        <span className="text-muted-foreground">
          ± {formatValue(stats.std, unit)} (n={stats.n})
        </span>
      </p>
      <dl className="mt-1 space-y-0.5 text-muted-foreground">
        <div>RxInfer {point.rxinferVersion} · Julia {point.juliaVersion}</div>
        <div>
          {point.commits.length === 1 ? "commit " : "commits "}
          {point.commits.map(shortCommit).join(", ")}
        </div>
        <div className="font-mono">{point.fingerprint.slice(0, 12)}</div>
      </dl>
    </div>
  );
}
