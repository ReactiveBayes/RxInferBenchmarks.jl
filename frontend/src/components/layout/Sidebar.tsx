"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { groupByCategory } from "@/lib/transform/nav";
import { cn } from "@/lib/utils";
import type { ExperimentDef } from "@/lib/data/types";

export function Sidebar({
  experiments,
  selected,
  onSelect,
  className,
}: {
  experiments: ExperimentDef[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? experiments.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q) ||
            (e.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
        )
      : experiments;
    return groupByCategory(filtered);
  }, [experiments, query]);

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="relative p-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          role="searchbox"
          aria-label="Search benchmarks"
          placeholder="Search benchmarks…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-md border bg-background py-1.5 pl-9 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <ScrollArea className="flex-1 px-3 pb-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "mb-2 w-full rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-sidebar-accent",
            selected === null && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          Overview
        </button>
        {groups.map((group) => (
          <section key={group.category} className="mb-3">
            <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h3>
            <ul>
              {group.experiments.map((experiment) => (
                <li key={experiment.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(experiment.id)}
                    aria-current={selected === experiment.id ? "page" : undefined}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent",
                      selected === experiment.id &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                  >
                    {experiment.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">No benchmarks match “{query}”.</p>
        )}
      </ScrollArea>
    </aside>
  );
}
