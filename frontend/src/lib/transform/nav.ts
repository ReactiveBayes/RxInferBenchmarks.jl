import type { ExperimentDef } from "@/lib/data/types";

export interface CategoryGroup {
  category: string;
  experiments: ExperimentDef[];
}

/** Sidebar tree: experiments grouped by category, in experiments.yml order. */
export function groupByCategory(experiments: ExperimentDef[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const byCategory = new Map<string, CategoryGroup>();
  for (const experiment of experiments) {
    let group = byCategory.get(experiment.category);
    if (!group) {
      group = { category: experiment.category, experiments: [] };
      byCategory.set(experiment.category, group);
      groups.push(group);
    }
    group.experiments.push(experiment);
  }
  return groups;
}
