"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ScenarioLegendItem {
  scenario: string;
  short: string;
  label: string;
  /** Hidden via an individual toggle. */
  hidden: boolean;
  /** Excluded by the active keyword filters. */
  filteredOut: boolean;
}

export interface ParamFilter {
  key: string;
  values: string[];
  active: string; // "all" or one of values
}

/**
 * Legend + controls for the scenario comparison: maps the short axis letters
 * to their parameters, lets individual scenarios be toggled (shift-click to
 * isolate), and groups scenarios by parameter keyword (e.g. only
 * mode=smoothing, only n=1000).
 */
export function ScenarioLegend({
  items,
  filters,
  onToggle,
  onFilterChange,
}: {
  items: ScenarioLegendItem[];
  filters: ParamFilter[];
  onToggle: (scenario: string, isolate: boolean) => void;
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <section aria-label="Scenario legend and filters" className="mb-3 space-y-2">
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">group by</span>
          {filters.map((filter) => (
            <div key={filter.key} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{filter.key}</span>
              <Select value={filter.active} onValueChange={(value) => onFilterChange(filter.key, value)}>
                <SelectTrigger size="sm" aria-label={`Filter by ${filter.key}`} className="h-7 cursor-pointer text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  {filter.values.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      <ul aria-label="Scenario legend" className="space-y-0.5">
        {items.map((item) => (
          <li key={item.scenario}>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={!item.hidden && !item.filteredOut}
              disabled={item.filteredOut}
              title={
                item.filteredOut
                  ? "Excluded by the active group filter"
                  : `${item.hidden ? "Show" : "Hide"} scenario ${item.short} — shift-click to isolate`
              }
              onClick={(event) => onToggle(item.scenario, event.shiftKey)}
              className={cn(
                "h-6 cursor-pointer justify-start px-1.5 text-xs font-normal",
                (item.hidden || item.filteredOut) && "opacity-45",
              )}
            >
              <span className="font-semibold">Scenario {item.short}</span>
              <span className="text-muted-foreground"> : {item.label}</span>
            </Button>
          </li>
        ))}
      </ul>

      {/* Non-obvious interactions are always documented under the controls (design/frontend.md). */}
      <p className="text-xs text-muted-foreground">
        help: click a scenario to toggle it · <kbd>shift</kbd>-click to isolate it · use the group
        selects to keep only scenarios matching a parameter value
      </p>
    </section>
  );
}
