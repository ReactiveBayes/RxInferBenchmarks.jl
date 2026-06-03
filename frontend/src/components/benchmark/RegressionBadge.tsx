import { MoveDownRight, MoveRight, MoveUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RegressionResult } from "@/lib/transform/regression";

/** Δ% vs the previous environment fingerprint, colored by better/worse. */
export function RegressionBadge({ result }: { result: RegressionResult }) {
  if (result.direction === "none") {
    return (
      <Badge
        variant="outline"
        aria-label="No previous entry to compare"
        title="First recorded environment — no previous entry to compare against yet"
        className="text-muted-foreground"
      >
        new
      </Badge>
    );
  }
  const icon =
    result.pctChange > 0 ? <MoveUpRight /> : result.pctChange < 0 ? <MoveDownRight /> : <MoveRight />;
  const explanation = {
    regression: "slower/worse than the previous environment",
    improvement: "faster/better than the previous environment",
    flat: "within the noise threshold of the previous environment",
  }[result.direction];
  return (
    <Badge
      variant="outline"
      aria-label={`Change vs previous: ${formatPct(result.pctChange)} (${result.direction})`}
      title={`${formatPct(result.pctChange)} vs the previous environment — ${explanation}`}
      className={cn(
        result.direction === "regression" && "border-signal-regress/40 bg-signal-regress/10 text-signal-regress",
        result.direction === "improvement" && "border-signal-improve/40 bg-signal-improve/10 text-signal-improve",
        result.direction === "flat" && "text-muted-foreground",
      )}
    >
      {icon}
      {formatPct(result.pctChange)}
    </Badge>
  );
}
