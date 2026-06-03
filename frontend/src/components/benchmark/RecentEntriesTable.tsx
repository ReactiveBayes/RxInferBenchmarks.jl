"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatPct, formatValue } from "@/lib/format";
import type { SeriesPoint } from "@/lib/transform/series";
import type { MetricDef } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** Latest environment entries for one metric, newest first, with Δ% per step. */
export function RecentEntriesTable({
  points,
  metric,
  maxRows = 10,
}: {
  points: SeriesPoint[];
  metric: MetricDef;
  maxRows?: number;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries yet.</p>;
  }
  const sorted = [...points].sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  const rows = sorted.slice(0, maxRows).map((point, index) => {
    const previous = sorted[index + 1];
    const pct =
      previous && previous.stats.mean !== 0
        ? ((point.stats.mean - previous.stats.mean) / previous.stats.mean) * 100
        : null;
    const worse = pct !== null && (metric.lower_is_better ? pct > 0 : pct < 0);
    return { point, pct, worse };
  });

  return (
    <Table aria-label={`Recent ${metric.label} entries`}>
      <TableHeader>
        <TableRow>
          <TableHead>First seen</TableHead>
          <TableHead>Fingerprint</TableHead>
          <TableHead>RxInfer</TableHead>
          <TableHead>Julia</TableHead>
          <TableHead className="text-right">n</TableHead>
          <TableHead className="text-right">{metric.label}</TableHead>
          <TableHead className="text-right">Δ%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ point, pct, worse }) => (
          <TableRow key={point.fingerprint}>
            <TableCell>{formatDate(point.firstSeen)}</TableCell>
            <TableCell className="font-mono text-xs">{point.fingerprint.slice(0, 12)}</TableCell>
            <TableCell>{point.rxinferVersion}</TableCell>
            <TableCell>{point.juliaVersion}</TableCell>
            <TableCell className="text-right">{point.stats.n}</TableCell>
            <TableCell className="text-right font-mono">
              {formatValue(point.stats.mean, metric.unit)}{" "}
              <span className="text-muted-foreground">± {formatValue(point.stats.std, metric.unit)}</span>
            </TableCell>
            <TableCell
              className={cn(
                "text-right",
                pct !== null && Math.abs(pct) >= 3 && (worse ? "text-signal-regress" : "text-signal-improve"),
              )}
            >
              {pct === null ? "—" : formatPct(pct)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
