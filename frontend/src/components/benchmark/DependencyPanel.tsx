"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { diffDependencies } from "@/lib/transform/deps";

/**
 * "What changed?" — the dependency diff between the latest environment
 * fingerprint and the previous one, with the full manifest on demand.
 */
export function DependencyPanel({
  current,
  previous,
  currentLabel,
}: {
  current: Record<string, string>;
  previous?: Record<string, string>;
  currentLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const diff = diffDependencies(previous, current);

  return (
    <section aria-label="Dependency changes" className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Environment <span className="font-mono">{currentLabel}</span> ·{" "}
        {Object.keys(current).length} packages
        {previous
          ? diff.hasChanges
            ? ` · ${diff.changed.length} changed, ${diff.added.length} added, ${diff.removed.length} removed vs previous`
            : " · identical to previous"
          : " · first recorded environment"}
      </p>

      {diff.hasChanges && (
        <ul className="space-y-1">
          {diff.changed.map((dep) => (
            <li key={dep.name} className="flex items-center gap-2">
              <Badge variant="outline" className="text-julia-blue">changed</Badge>
              <span className="font-medium">{dep.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {dep.from} → {dep.to}
              </span>
            </li>
          ))}
          {diff.added.map((dep) => (
            <li key={dep.name} className="flex items-center gap-2">
              <Badge variant="outline" className="text-signal-improve">added</Badge>
              <span className="font-medium">{dep.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{dep.version}</span>
            </li>
          ))}
          {diff.removed.map((dep) => (
            <li key={dep.name} className="flex items-center gap-2">
              <Badge variant="outline" className="text-signal-regress">removed</Badge>
              <span className="font-medium">{dep.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{dep.version}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {showAll ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {showAll ? "Hide" : "Show"} full manifest
      </button>
      {showAll && (
        <ul className="grid max-h-72 grid-cols-2 gap-x-6 gap-y-0.5 overflow-y-auto font-mono text-xs md:grid-cols-3">
          {Object.entries(current)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, version]) => (
              <li key={name} className="flex justify-between gap-2">
                <span>{name}</span>
                <span className="text-muted-foreground">{version}</span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
